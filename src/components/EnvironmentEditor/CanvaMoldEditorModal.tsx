import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { EnvironmentScene, WeatherPreset, PerspectiveQuad, LightSource3D } from '../../types/environment';
import { loadImageElement, getSampleArtwork } from '../../utils/imageLoader';
import { useAppStore } from '../../store/appStore';
import {
  AmbientLightMode,
  ReflectionType,
  REFLECTION_OPTIONS,
  CanvaShadowPreset,
  CANVA_SHADOW_OPTIONS,
  CATALOG_SIZES,
  CanvaImageAdjustOptions,
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
  CloudSun,
  Box,
  Grid,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Magnet,
  Image as ImageIcon,
  Home,
  Compass,
} from 'lucide-react';

interface CanvaMoldEditorModalProps {
  environment: EnvironmentScene;
  onClose: () => void;
}

type EditorTab = 'perspective' | 'color' | 'lighting' | 'shadow';
type AdjustDestination = 'artwork' | 'background';
type DragTarget =
  | 'center'
  | 'canvasOrbit'
  | 'topLeft'
  | 'topRight'
  | 'bottomRight'
  | 'bottomLeft'
  | 'topCenter'
  | 'bottomCenter'
  | 'leftCenter'
  | 'rightCenter'
  | 'wallPin_tl'
  | 'wallPin_tr'
  | 'wallPin_br'
  | 'wallPin_bl'
  | string // light_${id}
  | null;

interface EditorSnapshot {
  centerX: number;
  centerY: number;
  scaleWidth: number;
  wallAngle: number;
  pitchAngle: number;
  rollAngle: number;
  thicknessCm: number;
  zDistance: number;
  placementMode: 'wall' | 'shelf';
  isWallAnchored: boolean;
  wallCalibratedAngle: number;
  wallCalibratedPitch: number;
  wallQuad: PerspectiveQuad;
  lightsList: LightSource3D[];
  activeLightId: string;
  isSnappingEnabled: boolean;
  // Artwork adjustments
  temperature: number;
  tint: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadowsTone: number;
  whites: number;
  blacks: number;
  hue: number;
  saturation: number;
  vignette: number;
  invert: boolean;
  // Background adjustments
  temperatureBg: number;
  tintBg: number;
  brightnessBg: number;
  contrastBg: number;
  highlightsBg: number;
  shadowsToneBg: number;
  whitesBg: number;
  blacksBg: number;
  hueBg: number;
  saturationBg: number;
  vignetteBg: number;
  invertBg: boolean;
  // Lighting & shadows
  finishMode: 'resina' | 'brillante' | 'mate';
  reflectionType: ReflectionType;
  reflectionAngleDeg: number;
  reflectionIntensity: number;
  reflectionScale: number;
  reflectionRoughness: number;
  reflectionBrightness: number;
  reflectionContrast: number;
  weatherPreset: WeatherPreset;
  wallHarmonization: number;
  ceilingLightsEnabled: boolean;
  ceilingLightTemp: 'warm' | 'neutral' | 'cool';
  warmLampEnabled: boolean;
  sunIntensity: number;
  shadowPreset: CanvaShadowPreset;
  shadowBlur: number;
  shadowIntensity: number;
  shadowDistance: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowAngleDeg: number;
  shadowContactOcclusion: number;
}

export const CanvaMoldEditorModal: React.FC<CanvaMoldEditorModalProps> = ({ environment, onClose }) => {
  const { selectedImage, artworkSlots, productConfig, setProductConfig, updateEnvironment } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<EditorTab>('perspective');
  const [adjustDestination, setAdjustDestination] = useState<AdjustDestination>('artwork');

  const pos = environment.positions[0];
  const initialCenterX = pos?.centerX ?? (pos?.quad ? (pos.quad.topLeft.x + pos.quad.topRight.x) / 2 : 0.5);
  const initialCenterY = pos?.centerY ?? (pos?.quad ? (pos.quad.topLeft.y + pos.quad.bottomLeft.y) / 2 : 0.32);
  const initialScale = pos?.scaleWidth ?? (pos?.quad ? Math.abs(pos.quad.topRight.x - pos.quad.topLeft.x) : 0.42);

  // Placement Mode ('wall' = colgado en pared, 'shelf' = apoyado en repisa)
  const [placementMode, setPlacementMode] = useState<'wall' | 'shelf'>(
    pos?.placementMode ?? 'wall'
  );

  // 1. Spatial & 3D Parameters (Rehydrated from position)
  const [centerX, setCenterX] = useState(initialCenterX);
  const [centerY, setCenterY] = useState(initialCenterY);
  const [scaleWidth, setScaleWidth] = useState(Math.max(0.05, Math.min(0.90, initialScale)));
  const [wallAngle, setWallAngle] = useState(pos?.wallAngle ?? 0);
  const [pitchAngle, setPitchAngle] = useState(pos?.pitchDeg ?? 0);
  const [rollAngle, setRollAngle] = useState(pos?.rollDeg ?? pos?.rollAngle ?? 0);
  const [thicknessCm, setThicknessCm] = useState(pos?.thicknessCm ?? 1.0);
  const [zDistance, setZDistance] = useState(pos?.zDistance ?? 0);

  // Independent 3D Wall Grid Calibration & Anchoring
  const [isCalibratingWall, setIsCalibratingWall] = useState<boolean>(false);
  const [isWallAnchored, setIsWallAnchored] = useState<boolean>(pos?.isWallAnchored ?? true);
  const [wallCalibratedAngle, setWallCalibratedAngle] = useState<number>(
    pos?.wallCalibratedAngle ?? pos?.wallAngle ?? 0
  );
  const [wallCalibratedPitch, setWallCalibratedPitch] = useState<number>(
    pos?.wallCalibratedPitch ?? pos?.pitchDeg ?? 0
  );

  // Wall Perspective Quad (4 Corner Wall Pins)
  const [wallQuad, setWallQuad] = useState<PerspectiveQuad>(
    pos?.wallQuad ?? {
      topLeft: { x: 0.1, y: 0.1 },
      topRight: { x: 0.9, y: 0.1 },
      bottomRight: { x: 0.9, y: 0.9 },
      bottomLeft: { x: 0.1, y: 0.9 },
    }
  );

  // 3D Wall Perspective Grid Visibility (Disabled by default to keep photo clean)
  const [showWallGrid, setShowWallGrid] = useState<boolean>(false);

  // 2 Vanishing Reference Guides (fSpy Style for smart horizontal/shelf alignment)
  const [showVanishingGuides, setShowVanishingGuides] = useState<boolean>(false);
  const [guideLineA, setGuideLineA] = useState<{ p1: { x: number; y: number }; p2: { x: number; y: number } }>({
    p1: { x: 0.15, y: 0.68 },
    p2: { x: 0.85, y: 0.68 },
  });
  const [guideLineB, setGuideLineB] = useState<{ p1: { x: number; y: number }; p2: { x: number; y: number } }>({
    p1: { x: 0.15, y: 0.28 },
    p2: { x: 0.85, y: 0.30 },
  });

  // Multi-Light 3D Spheres Gizmo
  const [lightsList, setLightsList] = useState<LightSource3D[]>(() => {
    if (pos?.lightsList && pos.lightsList.length > 0) return pos.lightsList;
    const initX = pos?.lightPos3D?.x ?? pos?.lightSource3D?.x ?? 0.75;
    const initY = pos?.lightPos3D?.y ?? pos?.lightSource3D?.y ?? 0.25;
    const initZ = pos?.lightPos3D?.z ?? pos?.lightSource3D?.z ?? 1.0;
    const initInt = pos?.sunIntensity ?? 100;
    return [{ id: 'light_1', name: 'Sol 1', x: initX, y: initY, z: initZ, intensity: initInt }];
  });
  const [activeLightId, setActiveLightId] = useState<string>(lightsList[0]?.id || 'light_1');

  // Sun Light & Industrial Ceiling Lighting Parameters (Rehydrated)
  const [sunIntensity, setSunIntensity] = useState<number>(pos?.sunIntensity ?? 100);
  const [ceilingLightsEnabled, setCeilingLightsEnabled] = useState<boolean>(pos?.ceilingLightsEnabled ?? true);
  const [ceilingLightTemp, setCeilingLightTemp] = useState<'warm' | 'neutral' | 'cool'>(
    pos?.ceilingLightTemp ?? 'neutral'
  );

  // Snapping Guidelines & Magnetic Switch
  const [isSnappingEnabled, setIsSnappingEnabled] = useState<boolean>(pos?.isSnappingEnabled ?? true);
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

  // 3A. Artwork Image Adjustment Suite
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
  const [vignette, setVignette] = useState(pos?.vignette ?? pos?.adjust?.vignette ?? 0);
  const [invert, setInvert] = useState(pos?.invert ?? pos?.adjust?.invert ?? false);

  // 3B. Background Mockup Image Adjustment Suite
  const bgOpts = pos?.adjustBg ?? pos?.bgAdjust;
  const [temperatureBg, setTemperatureBg] = useState(bgOpts?.temperature ?? 0);
  const [tintBg, setTintBg] = useState(bgOpts?.tint ?? 0);
  const [brightnessBg, setBrightnessBg] = useState(bgOpts?.brightness ?? 0);
  const [contrastBg, setContrastBg] = useState(bgOpts?.contrast ?? 0);
  const [highlightsBg, setHighlightsBg] = useState(bgOpts?.highlights ?? 0);
  const [shadowsToneBg, setShadowsToneBg] = useState(bgOpts?.shadowsTone ?? 0);
  const [whitesBg, setWhitesBg] = useState(bgOpts?.whites ?? 0);
  const [blacksBg, setBlacksBg] = useState(bgOpts?.blacks ?? 0);
  const [hueBg, setHueBg] = useState(bgOpts?.hue ?? 0);
  const [saturationBg, setSaturationBg] = useState(bgOpts?.saturation ?? 0);
  const [vignetteBg, setVignetteBg] = useState(bgOpts?.vignette ?? 0);
  const [invertBg, setInvertBg] = useState(bgOpts?.invert ?? false);

  // 4. Auto-Synchronized Shadows (Rehydrated)
  const [shadowPreset, setShadowPreset] = useState<CanvaShadowPreset>(
    pos?.shadowPreset ?? productConfig.shadowPreset ?? 'parallel'
  );
  const [shadowBlur, setShadowBlur] = useState(pos?.shadowBlur ?? productConfig.shadowBlur ?? 25);
  const [shadowIntensity, setShadowIntensity] = useState(
    pos?.shadowStyleIntensity ?? productConfig.shadowIntensity ?? 50
  );
  const [shadowDistance, setShadowDistance] = useState(pos?.shadowDistance ?? 30);
  const [shadowOffsetX, setShadowOffsetX] = useState(pos?.shadowOffsetX ?? 0);
  const [shadowOffsetY, setShadowOffsetY] = useState(pos?.shadowOffsetY ?? 0);
  const [shadowAngleDeg, setShadowAngleDeg] = useState(
    pos?.shadowAngleDeg ?? 90 + (pos?.reflectionAngleDeg ?? productConfig.reflectionAngleDeg ?? 0) * 0.5
  );
  const [shadowContactOcclusion, setShadowContactOcclusion] = useState(
    pos?.shadowContactOcclusion ?? (pos?.placementMode === 'shelf' ? 80 : 40)
  );
  const [warmLampEnabled, setWarmLampEnabled] = useState<boolean>(pos?.warmLampEnabled ?? false);

  // Undo / Redo History Stack
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const takeSnapshot = useCallback((): EditorSnapshot => {
    return {
      centerX,
      centerY,
      scaleWidth,
      wallAngle,
      pitchAngle,
      rollAngle,
      thicknessCm,
      zDistance,
      placementMode,
      isWallAnchored,
      wallCalibratedAngle,
      wallCalibratedPitch,
      wallQuad: JSON.parse(JSON.stringify(wallQuad)),
      lightsList: JSON.parse(JSON.stringify(lightsList)),
      activeLightId,
      isSnappingEnabled,
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
      vignette,
      invert,
      temperatureBg,
      tintBg,
      brightnessBg,
      contrastBg,
      highlightsBg,
      shadowsToneBg,
      whitesBg,
      blacksBg,
      hueBg,
      saturationBg,
      vignetteBg,
      invertBg,
      finishMode,
      reflectionType,
      reflectionAngleDeg,
      reflectionIntensity,
      reflectionScale,
      reflectionRoughness,
      reflectionBrightness,
      reflectionContrast,
      weatherPreset,
      wallHarmonization,
      ceilingLightsEnabled,
      ceilingLightTemp,
      warmLampEnabled,
      sunIntensity,
      shadowPreset,
      shadowBlur,
      shadowIntensity,
      shadowDistance,
      shadowOffsetX,
      shadowOffsetY,
      shadowAngleDeg,
      shadowContactOcclusion,
    };
  }, [
    centerX,
    centerY,
    scaleWidth,
    wallAngle,
    pitchAngle,
    rollAngle,
    thicknessCm,
    zDistance,
    placementMode,
    isWallAnchored,
    wallCalibratedAngle,
    wallCalibratedPitch,
    wallQuad,
    lightsList,
    activeLightId,
    isSnappingEnabled,
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
    vignette,
    invert,
    temperatureBg,
    tintBg,
    brightnessBg,
    contrastBg,
    highlightsBg,
    shadowsToneBg,
    whitesBg,
    blacksBg,
    hueBg,
    saturationBg,
    vignetteBg,
    invertBg,
    finishMode,
    reflectionType,
    reflectionAngleDeg,
    reflectionIntensity,
    reflectionScale,
    reflectionRoughness,
    reflectionBrightness,
    reflectionContrast,
    weatherPreset,
    wallHarmonization,
    ceilingLightsEnabled,
    ceilingLightTemp,
    warmLampEnabled,
    sunIntensity,
    shadowPreset,
    shadowBlur,
    shadowIntensity,
    shadowDistance,
    shadowOffsetX,
    shadowOffsetY,
    shadowAngleDeg,
    shadowContactOcclusion,
  ]);

  const pushSnapshot = useCallback(() => {
    const snap = takeSnapshot();
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [takeSnapshot]);

  const applySnapshot = useCallback((snap: EditorSnapshot) => {
    setCenterX(snap.centerX);
    setCenterY(snap.centerY);
    setScaleWidth(snap.scaleWidth);
    setWallAngle(snap.wallAngle);
    setPitchAngle(snap.pitchAngle);
    setRollAngle(snap.rollAngle);
    setThicknessCm(snap.thicknessCm);
    setZDistance(snap.zDistance);
    setPlacementMode(snap.placementMode);
    setIsWallAnchored(snap.isWallAnchored);
    setWallCalibratedAngle(snap.wallCalibratedAngle);
    setWallCalibratedPitch(snap.wallCalibratedPitch);
    setWallQuad(snap.wallQuad);
    setLightsList(snap.lightsList);
    setActiveLightId(snap.activeLightId);
    setIsSnappingEnabled(snap.isSnappingEnabled);
    setTemperature(snap.temperature);
    setTint(snap.tint);
    setBrightness(snap.brightness);
    setContrast(snap.contrast);
    setHighlights(snap.highlights);
    setShadowsTone(snap.shadowsTone);
    setWhites(snap.whites);
    setBlacks(snap.blacks);
    setHue(snap.hue);
    setSaturation(snap.saturation);
    setVignette(snap.vignette);
    setInvert(snap.invert);
    setTemperatureBg(snap.temperatureBg);
    setTintBg(snap.tintBg);
    setBrightnessBg(snap.brightnessBg);
    setContrastBg(snap.contrastBg);
    setHighlightsBg(snap.highlightsBg);
    setShadowsToneBg(snap.shadowsToneBg);
    setWhitesBg(snap.whitesBg);
    setBlacksBg(snap.blacksBg);
    setHueBg(snap.hueBg);
    setSaturationBg(snap.saturationBg);
    setVignetteBg(snap.vignetteBg);
    setInvertBg(snap.invertBg);
    setFinishMode(snap.finishMode);
    setReflectionType(snap.reflectionType);
    setReflectionAngleDeg(snap.reflectionAngleDeg);
    setReflectionIntensity(snap.reflectionIntensity);
    setReflectionScale(snap.reflectionScale);
    setReflectionRoughness(snap.reflectionRoughness);
    setReflectionBrightness(snap.reflectionBrightness);
    setReflectionContrast(snap.reflectionContrast);
    setWeatherPreset(snap.weatherPreset);
    setWallHarmonization(snap.wallHarmonization);
    setCeilingLightsEnabled(snap.ceilingLightsEnabled);
    setCeilingLightTemp(snap.ceilingLightTemp);
    setWarmLampEnabled(snap.warmLampEnabled ?? false);
    setSunIntensity(snap.sunIntensity);
    setShadowPreset(snap.shadowPreset);
    setShadowBlur(snap.shadowBlur);
    setShadowIntensity(snap.shadowIntensity);
    setShadowDistance(snap.shadowDistance);
    setShadowOffsetX(snap.shadowOffsetX ?? 0);
    setShadowOffsetY(snap.shadowOffsetY ?? 0);
    setShadowAngleDeg(snap.shadowAngleDeg);
    setShadowContactOcclusion(snap.shadowContactOcclusion);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const currentSnap = takeSnapshot();
    const prevSnap = undoStackRef.current.pop()!;
    redoStackRef.current.push(currentSnap);
    applySnapshot(prevSnap);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, [takeSnapshot, applySnapshot]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const currentSnap = takeSnapshot();
    const nextSnap = redoStackRef.current.pop()!;
    undoStackRef.current.push(currentSnap);
    applySnapshot(nextSnap);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, [takeSnapshot, applySnapshot]);

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
    origQuad: { ...wallQuad },
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
    wallGridMesh: THREE.LineSegments | null;
    shadowCanvas: HTMLCanvasElement | null;
    shadowTexture: THREE.CanvasTexture | null;
    frontMaterials: THREE.MeshPhysicalMaterial[];
    edgeMaterialSets: THREE.Material[][];
    rawArtImages: HTMLImageElement[];
    proxyCanvases: HTMLCanvasElement[];
    gradedCanvases: HTMLCanvasElement[];
    gradedTextures: THREE.CanvasTexture[];
    roomProxyCanvas: HTMLCanvasElement | null;
    gradedRoomCanvas: HTMLCanvasElement | null;
    roomTex: THREE.CanvasTexture | null;
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
    wallGridMesh: null,
    shadowCanvas: null,
    shadowTexture: null,
    frontMaterials: [],
    edgeMaterialSets: [],
    rawArtImages: [],
    proxyCanvases: [],
    gradedCanvases: [],
    gradedTextures: [],
    roomProxyCanvas: null,
    gradedRoomCanvas: null,
    roomTex: null,
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

  // Track Ctrl / Cmd key state globally & handle Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlActive(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
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
  }, [handleUndo, handleRedo]);

  // Ctrl + Wheel (Scroll) smooth scale adjustment
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || isCtrlActive) {
        e.preventDefault();
        const delta = -e.deltaY * 0.0006;
        setScaleWidth((prev) => Math.max(0.05, Math.min(0.90, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isCtrlActive]);

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
      reflContrast: number,
      wallHarm: number,
      curFinish: 'resina' | 'brillante' | 'mate',
      sunInt: number,
      cLightsEnabled: boolean,
      cLightTemp: 'warm' | 'neutral' | 'cool'
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
          ceilingLightsEnabled: cLightsEnabled,
          ceilingLightTemp: cLightTemp,
          reflectionBrightness: reflBright,
          reflectionContrast: reflContrast,
          warmLampEnabled,
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
      let roughness = 0.08;
      let clearcoat = 0.85;
      let clearcoatRoughness = reflRough;
      let envMapIntensity = 2.0;
      let specularIntensity = 1.6;
      let emissiveBoost = 1.0;
      let ior = 1.50;

      if (curFinish === 'resina') {
        roughness = 0.015;
        clearcoat = 1.0;
        clearcoatRoughness = Math.min(reflRough, 0.02);
        envMapIntensity = 3.5 * Math.max(0.4, reflInt / 0.2);
        specularIntensity = 2.4;
        emissiveBoost = 1.04;
        ior = 1.54;
      } else if (curFinish === 'mate') {
        roughness = 0.42;
        clearcoat = 0.05;
        clearcoatRoughness = 0.85;
        envMapIntensity = 0.3 * (reflInt / 0.2);
        specularIntensity = 0.35;
        emissiveBoost = 1.0;
        ior = 1.45;
      } else {
        // Vinilo brillante
        roughness = 0.08;
        clearcoat = 0.85;
        clearcoatRoughness = reflRough;
        envMapIntensity = 2.0 * (reflInt / 0.2);
        specularIntensity = 1.6;
        emissiveBoost = 1.0;
        ior = 1.50;
      }

      // Weather lighting modifiers
      let ambIntensity = 0.4;
      let baseKeyIntensity = 1.4;
      let fillIntensity = 0.5;
      let weatherColor = new THREE.Color(0xffffff);

      if (wPreset === 'sunset') {
        weatherColor = new THREE.Color(0xffd7a8);
        ambIntensity = 0.38;
        baseKeyIntensity = 1.5;
      } else if (wPreset === 'night') {
        weatherColor = new THREE.Color(0x90b8f8);
        ambIntensity = 0.22;
        baseKeyIntensity = 1.6;
        fillIntensity = 0.25;
      } else if (wPreset === 'sunny') {
        weatherColor = new THREE.Color(0xfffaed);
        ambIntensity = 0.5;
        baseKeyIntensity = 1.8;
      } else if (wPreset === 'cloudy') {
        weatherColor = new THREE.Color(0xecf2f8);
        ambIntensity = 0.58;
        baseKeyIntensity = 0.95;
      }

      const keyIntensity = (sunInt / 100) * baseKeyIntensity;

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

  // Throttled 60fps Color Grading Pipeline for Artwork (using 1024px Proxy Canvas)
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
              vignette,
              invert,
            },
            gCanvas
          );
          gTex.needsUpdate = true;
        }
      });
    });
  }, [temperature, tint, brightness, contrast, highlights, shadowsTone, whites, blacks, hue, saturation, vignette, invert]);

  // Throttled 60fps Color Grading Pipeline for Mockup Background Plane
  const rafBgColorRef = useRef<number | null>(null);
  const updateBgColorThrottled = useCallback(() => {
    if (rafBgColorRef.current) cancelAnimationFrame(rafBgColorRef.current);
    rafBgColorRef.current = requestAnimationFrame(() => {
      const { roomProxyCanvas, gradedRoomCanvas, roomTex } = threeState.current;
      if (!roomProxyCanvas || !gradedRoomCanvas || !roomTex) return;

      applyCanvaAdjustmentsToCanvas(
        roomProxyCanvas as any,
        {
          temperature: temperatureBg,
          tint: tintBg,
          brightness: brightnessBg,
          contrast: contrastBg,
          highlights: highlightsBg,
          shadowsTone: shadowsToneBg,
          whites: whitesBg,
          blacks: blacksBg,
          hue: hueBg,
          saturation: saturationBg,
          vignette: vignetteBg,
          invert: invertBg,
        },
        gradedRoomCanvas
      );
      roomTex.needsUpdate = true;
    });
  }, [temperatureBg, tintBg, brightnessBg, contrastBg, highlightsBg, shadowsToneBg, whitesBg, blacksBg, hueBg, saturationBg, vignetteBg, invertBg]);

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

        // Room Background Plane with Proxy Canvas for Dual-Grading
        const roomProxyCanvas = document.createElement('canvas');
        const natEnvW = envImg.naturalWidth || envImg.width || 1920;
        const natEnvH = envImg.naturalHeight || envImg.height || 1080;
        roomProxyCanvas.width = natEnvW;
        roomProxyCanvas.height = natEnvH;
        const rCtx = roomProxyCanvas.getContext('2d')!;
        rCtx.drawImage(envImg, 0, 0, natEnvW, natEnvH);

        const gradedRoomCanvas = document.createElement('canvas');
        applyCanvaAdjustmentsToCanvas(
          roomProxyCanvas as any,
          {
            temperature: temperatureBg,
            tint: tintBg,
            brightness: brightnessBg,
            contrast: contrastBg,
            highlights: highlightsBg,
            shadowsTone: shadowsToneBg,
            whites: whitesBg,
            blacks: blacksBg,
            hue: hueBg,
            saturation: saturationBg,
            vignette: vignetteBg,
            invert: invertBg,
          },
          gradedRoomCanvas
        );

        const roomTex = new THREE.CanvasTexture(gradedRoomCanvas);
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

        const activeLight = lightsList.find((l) => l.id === activeLightId) || lightsList[0] || { x: 0.75, y: 0.25, z: 1.0, intensity: 100 };
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        const initLightX = (activeLight.x - 0.5) * bgW * 1.5;
        const initLightY = -(activeLight.y - 0.5) * bgH * 1.5;
        const initLightZ = Math.max(1.5, (activeLight.z ?? 1.0) * 5.0);
        keyLight.position.set(initLightX, initLightY, initLightZ);
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
              vignette,
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

          const isRes = finishMode === 'resina';
          const isMat = finishMode === 'mate';

          const frontMat = new THREE.MeshPhysicalMaterial({
            map: gTex,
            color: new THREE.Color(isRes ? 1.04 : 1, isRes ? 1.04 : 1, isRes ? 1.04 : 1),
            emissive: new THREE.Color(0xffffff),
            emissiveMap: gTex,
            emissiveIntensity: isRes ? 0.04 : isMat ? 0.12 : 0.08,
            roughness: isRes ? 0.015 : isMat ? 0.42 : 0.08,
            clearcoat: isRes ? 1.0 : isMat ? 0.05 : 0.85,
            clearcoatRoughness: isRes ? 0.015 : reflectionRoughness,
            envMapIntensity: isRes ? 3.5 : isMat ? 0.3 : 2.0,
            ior: isRes ? 1.54 : isMat ? 1.45 : 1.50,
            specularIntensity: isRes ? 2.4 : isMat ? 0.35 : 1.6,
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
          distance: shadowDistance,
          blur: shadowBlur,
          intensity: shadowIntensity,
          offsetX: shadowOffsetX,
          offsetY: shadowOffsetY,
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
        const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(totalW * 1.80, totalH * 1.80), shadowMat);
        scene.add(shadowMesh);

        // 3D Wall Perspective Wireframe Grid
        const gridSize = 4.0;
        const gridDivisions = 16;
        const step = gridSize / gridDivisions;
        const half = gridSize / 2;
        const linePoints: THREE.Vector3[] = [];
        for (let i = -half; i <= half + 0.0001; i += step) {
          linePoints.push(new THREE.Vector3(-half, i, 0), new THREE.Vector3(half, i, 0));
          linePoints.push(new THREE.Vector3(i, -half, 0), new THREE.Vector3(i, half, 0));
        }
        const gridGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
        const gridMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        });
        const wallGridMesh = new THREE.LineSegments(gridGeom, gridMat);
        wallGridMesh.position.set(0, 0, 0.002);
        wallGridMesh.visible = showWallGrid;
        scene.add(wallGridMesh);

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
          wallGridMesh,
          shadowCanvas,
          shadowTexture,
          frontMaterials,
          edgeMaterialSets,
          rawArtImages,
          proxyCanvases,
          gradedCanvases,
          gradedTextures,
          roomProxyCanvas,
          gradedRoomCanvas,
          roomTex,
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
          reflectionContrast,
          wallHarmonization,
          finishMode,
          sunIntensity,
          ceilingLightsEnabled,
          ceilingLightTemp
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
      if (rafBgColorRef.current) cancelAnimationFrame(rafBgColorRef.current);
      if (threeState.current.currentEnvRenderTarget) threeState.current.currentEnvRenderTarget.dispose();
      if (threeState.current.pmremGenerator) threeState.current.pmremGenerator.dispose();
      if (threeState.current.renderer) threeState.current.renderer.dispose();
    };
  }, [environment, selectedImage, artworkSlots, panelsCount, productConfig.setMode]);

  // 2. Dynamic 3D Transform & Sub-Pixel Vector Pin Projection (9 Pins)
  useEffect(() => {
    const { artGroup, shadowMesh, wallGridMesh, camera, bgW, bgH, totalW, totalH } = threeState.current;
    if (!artGroup || !shadowMesh || !camera) return;

    // Architectural Camera Shift: shifts optical axis to eliminate keystone distortion at 0° frontal
    const shiftX = (centerX - 0.5) * 660;
    const shiftY = (centerY - 0.5) * 660;
    camera.setViewOffset(660, 660, shiftX, shiftY, 660, 660);
    camera.updateProjectionMatrix();

    const normX = (centerX - 0.5) * bgW;
    const normY = -(centerY - 0.5) * bgH;
    const scaleFactor = scaleWidth / initialScale;

    const effectiveWallAngle = isCalibratingWall
      ? wallCalibratedAngle
      : isWallAnchored
      ? wallCalibratedAngle
      : wallAngle;
    const effectivePitch = isCalibratingWall
      ? wallCalibratedPitch
      : isWallAnchored
      ? wallCalibratedPitch
      : pitchAngle;

    // 3D Scene Mesh Position & 3-Axis Rotation with Physics Clamps (prevents wall penetration)
    const clampedZ = Math.max(0.01, 0.04 + Math.max(0, Math.min(8.0, zDistance)) / 100);
    artGroup.position.set(normX, normY, clampedZ);
    artGroup.scale.set(scaleFactor, scaleFactor, 1);
    artGroup.rotation.set(
      -(effectivePitch * Math.PI) / 180,
      (effectiveWallAngle * Math.PI) / 180,
      (rollAngle * Math.PI) / 180
    );

    shadowMesh.position.set(normX, normY, 0.01);
    shadowMesh.scale.set(scaleFactor, scaleFactor, 1);
    shadowMesh.rotation.set(
      -(effectivePitch * Math.PI) / 180,
      (effectiveWallAngle * Math.PI) / 180,
      (rollAngle * Math.PI) / 180
    );

    if (wallGridMesh) {
      wallGridMesh.position.set(normX, normY, 0.002);
      wallGridMesh.rotation.set(
        -(effectivePitch * Math.PI) / 180,
        (effectiveWallAngle * Math.PI) / 180,
        (rollAngle * Math.PI) / 180
      );
      wallGridMesh.visible = isCalibratingWall || showWallGrid;
      if (wallGridMesh.material && 'opacity' in wallGridMesh.material) {
        (wallGridMesh.material as THREE.LineBasicMaterial).opacity = isCalibratingWall ? 0.85 : 0.22;
        (wallGridMesh.material as THREE.LineBasicMaterial).needsUpdate = true;
      }
    }

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
  }, [
    centerX,
    centerY,
    scaleWidth,
    wallAngle,
    pitchAngle,
    rollAngle,
    zDistance,
    initialScale,
    showWallGrid,
    isCalibratingWall,
    isWallAnchored,
    wallCalibratedAngle,
    wallCalibratedPitch,
  ]);

  // Live Sync 3D KeyLight Position & Active Light Intensity
  useEffect(() => {
    const { keyLight, bgW, bgH } = threeState.current;
    const activeLight = lightsList.find((l) => l.id === activeLightId) || lightsList[0];
    if (keyLight && activeLight) {
      const lightWorldX = (activeLight.x - 0.5) * bgW * 1.5;
      const lightWorldY = -(activeLight.y - 0.5) * bgH * 1.5;
      const lightWorldZ = Math.max(1.5, (activeLight.z ?? 1.0) * 5.0);
      keyLight.position.set(lightWorldX, lightWorldY, lightWorldZ);
      keyLight.intensity = ((activeLight.intensity ?? sunIntensity) / 100) * 1.4;
    }
  }, [lightsList, activeLightId, sunIntensity]);

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
      reflectionContrast,
      wallHarmonization,
      finishMode,
      sunIntensity,
      ceilingLightsEnabled,
      ceilingLightTemp
    );
  }, [
    reflectionType,
    reflectionAngleDeg,
    weatherPreset,
    reflectionIntensity,
    reflectionScale,
    reflectionRoughness,
    reflectionBrightness,
    reflectionContrast,
    wallHarmonization,
    finishMode,
    sunIntensity,
    ceilingLightsEnabled,
    ceilingLightTemp,
    updateEnvironmentLighting,
  ]);

  useEffect(() => {
    updateArtworkColorThrottled();
  }, [updateArtworkColorThrottled]);

  useEffect(() => {
    updateBgColorThrottled();
  }, [updateBgColorThrottled]);

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
        offsetX: shadowOffsetX,
        offsetY: shadowOffsetY,
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
    shadowOffsetX,
    shadowOffsetY,
    wallAngle,
    pitchAngle,
    rollAngle,
    zDistance,
    shadowContactOcclusion,
  ]);

  // Mouse Handlers with 9 Vector Pins + Wall Quad + Multi-Light Gizmo + Shortcuts
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    pushSnapshot();

    let hitTarget: DragTarget = null;

    // Check Vanishing Reference Guides if enabled
    if (showVanishingGuides) {
      if (Math.hypot(clickX - guideLineA.p1.x, clickY - guideLineA.p1.y) < 0.05) hitTarget = 'guideA_p1';
      else if (Math.hypot(clickX - guideLineA.p2.x, clickY - guideLineA.p2.y) < 0.05) hitTarget = 'guideA_p2';
      else if (Math.hypot(clickX - guideLineB.p1.x, clickY - guideLineB.p1.y) < 0.05) hitTarget = 'guideB_p1';
      else if (Math.hypot(clickX - guideLineB.p2.x, clickY - guideLineB.p2.y) < 0.05) hitTarget = 'guideB_p2';
    }

    // Check Multi-Light Spheres if not hit guide
    if (!hitTarget) {
      for (const light of lightsList) {
        const lightDist = Math.hypot(clickX * 100 - light.x * 100, clickY * 100 - light.y * 100);
        if (lightDist < 7) {
          hitTarget = `light_${light.id}`;
          setActiveLightId(light.id);
          break;
        }
      }
    }

    // Check 9 Vector Pins
    if (!hitTarget && screenPins) {
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

    // Check Ctrl Free Orbit on canvas body
    const isCtrl = e.ctrlKey || e.metaKey || isCtrlActive;
    if (!hitTarget) {
      if (isCtrl) {
        hitTarget = 'canvasOrbit';
      } else {
        hitTarget = 'center';
      }
    }

    setDragTarget(hitTarget);

    dragStart.current = {
      x: clickX,
      y: clickY,
      origX: centerX,
      origY: centerY,
      origScale: scaleWidth,
      origAngle: wallAngle,
      origPitch: pitchAngle,
      origRoll: rollAngle,
      origQuad: {
        topLeft: { ...wallQuad.topLeft },
        topRight: { ...wallQuad.topRight },
        bottomRight: { ...wallQuad.bottomRight },
        bottomLeft: { ...wallQuad.bottomLeft },
      },
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / rect.width;
    const curY = (e.clientY - rect.top) / rect.height;

    if (!dragTarget) {
      if (isCalibratingWall) {
        const distTL = Math.hypot(curX - wallQuad.topLeft.x, curY - wallQuad.topLeft.y);
        const distTR = Math.hypot(curX - wallQuad.topRight.x, curY - wallQuad.topRight.y);
        const distBR = Math.hypot(curX - wallQuad.bottomRight.x, curY - wallQuad.bottomRight.y);
        const distBL = Math.hypot(curX - wallQuad.bottomLeft.x, curY - wallQuad.bottomLeft.y);
        if (distTL < 0.08) { setHoveredTarget('wallPin_tl'); return; }
        if (distTR < 0.08) { setHoveredTarget('wallPin_tr'); return; }
        if (distBR < 0.08) { setHoveredTarget('wallPin_br'); return; }
        if (distBL < 0.08) { setHoveredTarget('wallPin_bl'); return; }
      }

      for (const light of lightsList) {
        const lightDist = Math.hypot(curX * 100 - light.x * 100, curY * 100 - light.y * 100);
        if (lightDist < 7) {
          setHoveredTarget(`light_${light.id}`);
          return;
        }
      }

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
      } else {
        setHoveredTarget(null);
      }
      return;
    }

    const deltaX = curX - dragStart.current.x;
    const deltaY = curY - dragStart.current.y;
    const isCtrl = e.ctrlKey || e.metaKey || isCtrlActive;

    // 1. Dragging Vanishing Reference Guide Points
    if (dragTarget.startsWith('guideA_') || dragTarget.startsWith('guideB_')) {
      const clampedX = Math.max(0.02, Math.min(0.98, curX));
      const clampedY = Math.max(0.02, Math.min(0.98, curY));

      const nextA = { ...guideLineA };
      const nextB = { ...guideLineB };

      if (dragTarget === 'guideA_p1') nextA.p1 = { x: clampedX, y: clampedY };
      if (dragTarget === 'guideA_p2') nextA.p2 = { x: clampedX, y: clampedY };
      if (dragTarget === 'guideB_p1') nextB.p1 = { x: clampedX, y: clampedY };
      if (dragTarget === 'guideB_p2') nextB.p2 = { x: clampedX, y: clampedY };

      setGuideLineA(nextA);
      setGuideLineB(nextB);

      // Auto calculate vanishing angle from convergence
      const dxA = nextA.p2.x - nextA.p1.x || 0.0001;
      const dyA = nextA.p2.y - nextA.p1.y;
      const slopeA = dyA / dxA;

      const dxB = nextB.p2.x - nextB.p1.x || 0.0001;
      const dyB = nextB.p2.y - nextB.p1.y;
      const slopeB = dyB / dxB;

      const avgSlope = (slopeA + slopeB) / 2;
      const calculatedAngle = Math.round(Math.atan(avgSlope) * (180 / Math.PI) * 1.5);
      const clampedAngle = Math.max(-60, Math.min(60, calculatedAngle));
      setWallAngle(clampedAngle);
    }
    // 2. Dragging Light Sphere Gizmo
    else if (dragTarget.startsWith('light_')) {
      const lightId = dragTarget.replace('light_', '');
      const newX = Math.max(0.05, Math.min(0.95, curX));
      const newY = Math.max(0.05, Math.min(0.95, curY));

      setLightsList((prev) =>
        prev.map((l) => (l.id === lightId ? { ...l, x: newX, y: newY } : l))
      );

      // Synchronize reflection angle & shadow angle for active light
      const frameCenterX = screenPins ? screenPins.center.x / 100 : centerX;
      const frameCenterY = screenPins ? screenPins.center.y / 100 : centerY;
      const angleRad = Math.atan2(newY - frameCenterY, newX - frameCenterX);
      const rawAngleDeg = (angleRad * 180) / Math.PI;
      const positiveReflDeg = Math.round(((rawAngleDeg % 360) + 360) % 360);
      const oppShadowDeg = Math.round((positiveReflDeg + 180) % 360);

      setReflectionAngleDeg(positiveReflDeg);
      setShadowAngleDeg(oppShadowDeg);
    }
    // 3. Free Canvas 3D Orbit (Ctrl + Drag on Canvas)
    else if (dragTarget === 'canvasOrbit') {
      const newAngle = Math.max(-85, Math.min(85, Math.round(dragStart.current.origAngle + deltaX * 160)));
      const newPitch = Math.max(-75, Math.min(75, Math.round(dragStart.current.origPitch - deltaY * 150)));
      if (isCalibratingWall) {
        setWallCalibratedAngle(newAngle);
        setWallCalibratedPitch(newPitch);
      }
      setWallAngle(newAngle);
      setPitchAngle(newPitch);
    }
    // 4. Moving Center Position (with Magnetic Guides)
    else if (dragTarget === 'center') {
      if (isCtrl) {
        // Ctrl + Drag on Center triggers 3D orbit
        const newAngle = Math.max(-85, Math.min(85, Math.round(dragStart.current.origAngle + deltaX * 160)));
        const newPitch = Math.max(-75, Math.min(75, Math.round(dragStart.current.origPitch - deltaY * 150)));
        if (isCalibratingWall) {
          setWallCalibratedAngle(newAngle);
          setWallCalibratedPitch(newPitch);
        }
        setWallAngle(newAngle);
        setPitchAngle(newPitch);
        setIsSnappedX(false);
        setIsSnappedY(false);
      } else {
        let rawX = dragStart.current.origX + deltaX;
        let rawY = dragStart.current.origY + deltaY;

        if (isSnappingEnabled) {
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
        } else {
          setIsSnappedX(false);
          setIsSnappedY(false);
        }

        setCenterX(Math.min(Math.max(rawX, 0.05), 0.95));
        setCenterY(Math.min(Math.max(rawY, 0.05), 0.95));
      }
    }
    // 5. Celestial Midpoints (Pitch & Yaw)
    else if (dragTarget === 'topCenter') {
      const newPitch = isCtrl
        ? Math.max(-75, Math.min(75, Math.round(dragStart.current.origPitch - deltaY * 150)))
        : Math.max(-30, Math.min(30, Math.round(dragStart.current.origPitch - deltaY * 100)));
      if (isCalibratingWall) setWallCalibratedPitch(newPitch);
      setPitchAngle(newPitch);
    } else if (dragTarget === 'bottomCenter') {
      const newPitch = isCtrl
        ? Math.max(-75, Math.min(75, Math.round(dragStart.current.origPitch + deltaY * 150)))
        : Math.max(-30, Math.min(30, Math.round(dragStart.current.origPitch + deltaY * 100)));
      if (isCalibratingWall) setWallCalibratedPitch(newPitch);
      setPitchAngle(newPitch);
    } else if (dragTarget === 'leftCenter') {
      const newAngle = isCtrl
        ? Math.max(-85, Math.min(85, Math.round(dragStart.current.origAngle - deltaX * 160)))
        : Math.max(-60, Math.min(60, Math.round(dragStart.current.origAngle - deltaX * 120)));
      if (isCalibratingWall) setWallCalibratedAngle(newAngle);
      setWallAngle(newAngle);
    } else if (dragTarget === 'rightCenter') {
      const newAngle = isCtrl
        ? Math.max(-85, Math.min(85, Math.round(dragStart.current.origAngle + deltaX * 160)))
        : Math.max(-60, Math.min(60, Math.round(dragStart.current.origAngle + deltaX * 120)));
      if (isCalibratingWall) setWallCalibratedAngle(newAngle);
      setWallAngle(newAngle);
    }
    // 6. Corner Pins (Proportional Scale or Ctrl: Z-Roll)
    else if (['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].includes(dragTarget)) {
      const centerPxX = (screenPins ? screenPins.center.x / 100 : centerX) * rect.width;
      const centerPxY = (screenPins ? screenPins.center.y / 100 : centerY) * rect.height;

      if (isCtrl) {
        const startMouseAngle = Math.atan2(
          dragStart.current.y * rect.height - centerPxY,
          dragStart.current.x * rect.width - centerPxX
        );
        const curMouseAngle = Math.atan2(curY * rect.height - centerPxY, curX * rect.width - centerPxX);
        const diffDeg = ((curMouseAngle - startMouseAngle) * 180) / Math.PI;
        const newRoll = Math.max(-45, Math.min(45, Math.round(dragStart.current.origRoll + diffDeg)));
        setRollAngle(newRoll);
      } else {
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

  const handleToggleWallCalibration = () => {
    pushSnapshot();
    if (isCalibratingWall) {
      setIsCalibratingWall(false);
      setIsWallAnchored(true);
      setWallAngle(wallCalibratedAngle);
      setPitchAngle(wallCalibratedPitch);
    } else {
      setIsCalibratingWall(true);
      setIsWallAnchored(false);
      setShowWallGrid(true);
    }
  };

  const handleAutoCenter = () => {
    pushSnapshot();
    setCenterX(0.5);
    setCenterY(0.32);
    setWallAngle(0);
    setPitchAngle(0);
    setRollAngle(0);
    setZDistance(0);
    setPlacementMode('wall');
    setShadowContactOcclusion(40);
    setWallCalibratedAngle(0);
    setWallCalibratedPitch(0);
    setIsCalibratingWall(false);
    setIsWallAnchored(true);
  };

  const handlePlacementModeChange = (mode: 'wall' | 'shelf') => {
    pushSnapshot();
    setPlacementMode(mode);
    if (mode === 'shelf') {
      setShadowContactOcclusion(80);
      if (pitchAngle === 0) {
        setPitchAngle(15);
      }
    } else {
      if (shadowContactOcclusion === 80) {
        setShadowContactOcclusion(40);
      }
      setPitchAngle(0);
    }
  };

  // Add Light to Multi-Light list
  const handleAddLight = () => {
    if (lightsList.length >= 4) return;
    pushSnapshot();
    const newId = `light_${Date.now()}`;
    const newIdx = lightsList.length + 1;
    const newLight: LightSource3D = {
      id: newId,
      name: `Foco ${newIdx}`,
      x: Math.min(0.85, 0.25 * newIdx),
      y: 0.25,
      z: 1.0,
      intensity: 100,
    };
    setLightsList([...lightsList, newLight]);
    setActiveLightId(newId);
  };

  // Remove Light from Multi-Light list
  const handleRemoveLight = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightsList.length <= 1) return;
    pushSnapshot();
    const filtered = lightsList.filter((l) => l.id !== id);
    setLightsList(filtered);
    if (activeLightId === id) {
      setActiveLightId(filtered[0]?.id || '');
    }
  };

  // Full Persistence: Save all 3D, optical, color & shadow parameters
  const handleSave = () => {
    const artAspect = threeState.current.artAspect || 1.0;
    const halfW = scaleWidth / 2;
    const halfH = scaleWidth / artAspect / 2;

    const finalWallAngle = isWallAnchored ? wallCalibratedAngle : wallAngle;
    const finalPitchAngle = isWallAnchored ? wallCalibratedPitch : pitchAngle;
    const activeLight = lightsList.find((l) => l.id === activeLightId) || lightsList[0] || { x: 0.75, y: 0.25, z: 1.0, intensity: 100 };

    const updatedEnv: EnvironmentScene = {
      ...environment,
      positions: [
        {
          ...pos,
          centerX,
          centerY,
          scaleWidth,
          wallAngle: finalWallAngle,
          pitchDeg: finalPitchAngle,
          rollAngle,
          rollDeg: rollAngle,
          thicknessCm,
          zDistance,
          placementMode,
          isWallAnchored,
          wallCalibratedAngle,
          wallCalibratedPitch,
          wallQuad,
          lightsList,
          isSnappingEnabled,
          sunIntensity: activeLight.intensity ?? sunIntensity,
          ceilingLightsEnabled,
          ceilingLightTemp,
          lightPos3D: { x: activeLight.x, y: activeLight.y, z: activeLight.z },
          lightSource3D: { x: activeLight.x, y: activeLight.y, z: activeLight.z },
          shadowBlur,
          shadowIntensity,
          shadowStyleIntensity: shadowIntensity,
          shadowAngleDeg,
          shadowDistance,
          shadowContactOcclusion,
          shelfContactShadow: placementMode === 'shelf' || shadowContactOcclusion > 0,
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
          // Artwork Grading
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
          vignette,
          invert,
          adjust: {
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
            vignette,
            invert,
          },
          // Background Mockup Grading
          adjustBg: {
            temperature: temperatureBg,
            tint: tintBg,
            brightness: brightnessBg,
            contrast: contrastBg,
            highlights: highlightsBg,
            shadowsTone: shadowsToneBg,
            whites: whitesBg,
            blacks: blacksBg,
            hue: hueBg,
            saturation: saturationBg,
            vignette: vignetteBg,
            invert: invertBg,
          },
          bgAdjust: {
            temperature: temperatureBg,
            tint: tintBg,
            brightness: brightnessBg,
            contrast: contrastBg,
            highlights: highlightsBg,
            shadowsTone: shadowsToneBg,
            whites: whitesBg,
            blacks: blacksBg,
            hue: hueBg,
            saturation: saturationBg,
            vignette: vignetteBg,
            invert: invertBg,
          },
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
    useAppStore.getState().syncToStore();

    setProductConfig({
      placementMode,
      lightPos3D: { x: activeLight.x, y: activeLight.y, z: activeLight.z },
      lightSource3D: { x: activeLight.x, y: activeLight.y, z: activeLight.z },
      wallAngle: finalWallAngle,
      pitchDeg: finalPitchAngle,
      reflectionAngleDeg,
      reflectionIntensity,
      reflectionScale,
      reflectionRoughness,
      reflectionType,
      wallHarmonization,
      isWallAnchored,
      wallCalibratedAngle,
      wallCalibratedPitch,
      sunIntensity: activeLight.intensity ?? sunIntensity,
      ceilingLightsEnabled,
      ceilingLightTemp,
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

  const selectedLight = lightsList.find((l) => l.id === activeLightId) || lightsList[0];

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
        {/* Top Header Toolbar */}
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
            {/* Undo Button */}
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Deshacer cambio (Ctrl + Z)"
              style={{
                background: canUndo ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: canUndo ? '#ffffff' : '#475569',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: canUndo ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Undo2 size={13} />
              <span>Deshacer</span>
            </button>

            {/* Redo Button */}
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Rehacer cambio (Ctrl + Y)"
              style={{
                background: canRedo ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: canRedo ? '#ffffff' : '#475569',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: canRedo ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Redo2 size={13} />
              <span>Rehacer</span>
            </button>

            {/* Magnet Toggle Button */}
            <button
              onClick={() => {
                pushSnapshot();
                setIsSnappingEnabled(!isSnappingEnabled);
              }}
              title={isSnappingEnabled ? 'Guías Magnéticas: ACTIVADAS' : 'Guías Magnéticas: DESACTIVADAS'}
              style={{
                background: isSnappingEnabled ? 'rgba(222, 35, 103, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: isSnappingEnabled ? '1px solid #de2367' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isSnappingEnabled ? '#de2367' : '#94a3b8',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Magnet size={13} />
              <span>Imán: {isSnappingEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Auto-Centrar */}
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
              <span>Auto-Centrar</span>
            </button>

            {/* Close Button */}
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
          {/* Left Canvas with Interactive Vector Pins & Multi-Light Gizmo */}
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
                  if (dragTarget.startsWith('wallPin_')) return 'crosshair';
                  if (dragTarget.startsWith('light_')) return 'grabbing';
                  if (isCtrlActive || dragTarget === 'canvasOrbit') return 'grabbing';
                  if (dragTarget === 'center') return 'grabbing';
                  if (dragTarget === 'topCenter' || dragTarget === 'bottomCenter') return 'ns-resize';
                  if (dragTarget === 'leftCenter' || dragTarget === 'rightCenter') return 'ew-resize';
                  if (dragTarget === 'topLeft' || dragTarget === 'bottomRight') return isCtrlActive ? 'grabbing' : 'nwse-resize';
                  if (dragTarget === 'topRight' || dragTarget === 'bottomLeft') return isCtrlActive ? 'grabbing' : 'nesw-resize';
                  return 'grabbing';
                }
                if (hoveredTarget) {
                  if (hoveredTarget.startsWith('wallPin_')) return 'crosshair';
                  if (hoveredTarget.startsWith('light_')) return 'grab';
                  if (isCtrlActive) return 'grab';
                  if (hoveredTarget === 'center') return 'grab';
                  if (hoveredTarget === 'topCenter' || hoveredTarget === 'bottomCenter') return 'ns-resize';
                  if (hoveredTarget === 'leftCenter' || hoveredTarget === 'rightCenter') return 'ew-resize';
                  if (hoveredTarget === 'topLeft' || hoveredTarget === 'bottomRight') return isCtrlActive ? 'grab' : 'nwse-resize';
                  if (hoveredTarget === 'topRight' || hoveredTarget === 'bottomLeft') return isCtrlActive ? 'grab' : 'nesw-resize';
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

            {/* Auto-Hide Guidelines, Pins, Outline & Tips */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                opacity: isHovered || dragTarget !== null || isCalibratingWall ? 1 : 0,
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
                    {dragTarget === 'canvasOrbit' || (!dragTarget && isHovered)
                      ? `Órbita 3D Libre (Arrastra para girar Ángulo e Inclinación | Rueda para Zoom)`
                      : dragTarget === 'topCenter' || dragTarget === 'bottomCenter'
                      ? `Acostar objeto: ${pitchAngle > 0 ? `+${pitchAngle}°` : `${pitchAngle}°`}`
                      : dragTarget === 'leftCenter' || dragTarget === 'rightCenter'
                      ? `Perspectiva / Giro: ${wallAngle > 0 ? `+${wallAngle}°` : `${wallAngle}°`}`
                      : `Rotación Z: ${rollAngle > 0 ? `+${rollAngle}°` : `${rollAngle}°`}`}
                  </span>
                </div>
              )}

              {/* SVG Overlay: Vector Quad Outline, Rays to Light Spheres, and Vanishing Wall Grid */}
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
                {/* 2 Vanishing Reference Guides (fSpy Style for Smart Wall Alignment) */}
                {showVanishingGuides && (
                  <g>
                    {/* Line A (Gold) */}
                    <line
                      x1={`${guideLineA.p1.x * 100}%`}
                      y1={`${guideLineA.p1.y * 100}%`}
                      x2={`${guideLineA.p2.x * 100}%`}
                      y2={`${guideLineA.p2.y * 100}%`}
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                    {/* Line B (Cyan) */}
                    <line
                      x1={`${guideLineB.p1.x * 100}%`}
                      y1={`${guideLineB.p1.y * 100}%`}
                      x2={`${guideLineB.p2.x * 100}%`}
                      y2={`${guideLineB.p2.y * 100}%`}
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                  </g>
                )}

                {/* Frame Artwork Quad Outline & Subtle Rays to All Light Spheres */}
                {screenPins && (
                  <>
                    <polygon
                      points={`${screenPins.tl.x}%,${screenPins.tl.y}% ${screenPins.tr.x}%,${screenPins.tr.y}% ${screenPins.br.x}%,${screenPins.br.y}% ${screenPins.bl.x}%,${screenPins.bl.y}%`}
                      fill="rgba(222, 35, 103, 0.06)"
                      stroke="#de2367"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />

                    {/* Glowing Rays from Frame Center to Each 3D Light */}
                    {lightsList.map((l) => {
                      const isActive = l.id === activeLightId;
                      return (
                        <line
                          key={`ray-${l.id}`}
                          x1={`${screenPins.center.x}%`}
                          y1={`${screenPins.center.y}%`}
                          x2={`${l.x * 100}%`}
                          y2={`${l.y * 100}%`}
                          stroke={isActive ? '#fbbf24' : '#f59e0b'}
                          strokeWidth={isActive ? '1.8' : '1'}
                          strokeDasharray={isActive ? '4 3' : '2 3'}
                          opacity={isActive ? 0.95 : 0.45}
                        />
                      );
                    })}
                  </>
                )}
              </svg>

              {/* 4 Draggable Vanishing Guide Handles (fSpy style) */}
              {showVanishingGuides && (
                <>
                  {[
                    { id: 'guideA_p1', label: 'Guía A - Extremo Izq', pt: guideLineA.p1, color: '#f59e0b' },
                    { id: 'guideA_p2', label: 'Guía A - Extremo Der', pt: guideLineA.p2, color: '#f59e0b' },
                    { id: 'guideB_p1', label: 'Guía B - Extremo Izq', pt: guideLineB.p1, color: '#06b6d4' },
                    { id: 'guideB_p2', label: 'Guía B - Extremo Der', pt: guideLineB.p2, color: '#06b6d4' },
                  ].map((pin) => (
                    <div
                      key={pin.id}
                      title={pin.label}
                      style={{
                        position: 'absolute',
                        left: `${pin.pt.x * 100}%`,
                        top: `${pin.pt.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: pin.color,
                        border: '2.5px solid #ffffff',
                        boxShadow: `0 0 12px ${pin.color}`,
                        pointerEvents: 'none',
                        zIndex: 35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* Multi-Light 3D Spheres on Canvas */}
              {lightsList.map((light, index) => {
                const isActive = light.id === activeLightId;
                const isBeingDragged = dragTarget === `light_${light.id}`;
                const isBeingHovered = hoveredTarget === `light_${light.id}`;

                return (
                  <div
                    key={light.id}
                    title={`${light.name || `Foco ${index + 1}`}: Arrastra para iluminar desde este ángulo (${light.intensity ?? 100}%)`}
                    style={{
                      position: 'absolute',
                      left: `${light.x * 100}%`,
                      top: `${light.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: isActive ? '28px' : '22px',
                      height: isActive ? '28px' : '22px',
                      borderRadius: '50%',
                      background: isActive
                        ? 'radial-gradient(circle at 35% 35%, #fffbeb 15%, #f59e0b 65%, #b45309 100%)'
                        : 'radial-gradient(circle at 35% 35%, #fef3c7 15%, #d97706 70%, #78350f 100%)',
                      border: isActive ? '2px solid #ffffff' : '1.5px solid rgba(255, 255, 255, 0.7)',
                      boxShadow:
                        isActive || isBeingHovered || isBeingDragged
                          ? '0 0 20px rgba(245, 158, 11, 0.8), 0 0 6px #ffffff'
                          : '0 0 10px rgba(245, 158, 11, 0.4)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: isActive ? 30 : 25,
                      transition: isBeingDragged ? 'none' : 'all 0.2s ease',
                    }}
                  >
                    <Sun size={isActive ? 14 : 11} strokeWidth={2.2} color="#78350f" />
                    {lightsList.length > 1 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-14px',
                          fontSize: '8.5px',
                          fontWeight: 800,
                          color: isActive ? '#fbbf24' : '#cbd5e1',
                          background: 'rgba(0,0,0,0.7)',
                          padding: '1px 4px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {light.name || `#${index + 1}`}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* 9 Interactive Vector Pin Handles for Frame Placement */}
              {!isCalibratingWall && screenPins && (
                <>
                  {/* 4 Corner Pins */}
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

                  {/* 4 Celestial Midpoint Pins (Cyan) */}
                  <div
                    title="Pin Superior: Inclinación Vertical (Pitch). Ctrl + Arrastre: Acostar objeto."
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
                  <div
                    title="Pin Inferior: Inclinación Vertical (Pitch). Ctrl + Arrastre: Acostar objeto."
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
                  <div
                    title="Pin Lateral Izquierdo: Ángulo de Pared (Yaw)."
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
                  <div
                    title="Pin Lateral Derecho: Ángulo de Pared (Yaw)."
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
                  📍 <strong>Centro</strong>: Mover ({isSnappingEnabled ? 'Imán activo' : 'Libre'})
                </span>
                <span>
                  ☀️ <strong>Sol</strong>: Focos de Luz 3D
                </span>
                <span>
                  ⌨️ <strong>Ctrl + Arrastre</strong>: Órbita 3D | <strong>Ctrl + Rueda</strong>: Zoom
                </span>
                <span>
                  ⤡ <strong>Esquinas</strong>: Escalar (Ctrl: Rotación Z)
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
                {/* 0. Sección Guías de Fuga Ópticas (fSpy) y Alineación Inteligente */}
                <div
                  style={{
                    background: showVanishingGuides ? 'rgba(245, 158, 11, 0.10)' : 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: showVanishingGuides ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Compass size={15} color={showVanishingGuides ? '#f59e0b' : '#94a3b8'} />
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', display: 'block' }}>
                          📐 Guías de Fuga de Perspectiva
                        </span>
                        <span style={{ fontSize: '9.5px', color: showVanishingGuides ? '#f59e0b' : '#94a3b8' }}>
                          {showVanishingGuides ? 'Arrastrá las 2 líneas sobre la repisa/zócalo' : 'Alineación automática de pared'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowVanishingGuides(!showVanishingGuides)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: showVanishingGuides ? '#f59e0b' : 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid #f59e0b',
                        color: showVanishingGuides ? '#040d1a' : '#f59e0b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: showVanishingGuides ? '0 0 12px rgba(245, 158, 11, 0.5)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{showVanishingGuides ? '✓ Ocultar Guías' : '📐 Trazar Guías'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Ángulo de Pared (Yaw)</span>
                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>{wallAngle > 0 ? `+${wallAngle}°` : `${wallAngle}°`}</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        step="1"
                        value={wallAngle}
                        onChange={(e) => {
                          pushSnapshot();
                          setWallAngle(parseInt(e.target.value));
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Inclinación Vertical (Pitch)</span>
                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>{pitchAngle > 0 ? `+${pitchAngle}°` : `${pitchAngle}°`}</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="1"
                        value={pitchAngle}
                        onChange={(e) => {
                          pushSnapshot();
                          setPitchAngle(parseInt(e.target.value));
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 1. Modo de Colocación (Pared vs Repisa) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                    📐 Modo de Colocación
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      onClick={() => handlePlacementModeChange('wall')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: placementMode === 'wall' ? 700 : 500,
                        border:
                          placementMode === 'wall'
                            ? '1.5px solid var(--accent-primary)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                        background:
                          placementMode === 'wall'
                            ? 'var(--accent-primary-subtle)'
                            : 'rgba(255, 255, 255, 0.03)',
                        color: placementMode === 'wall' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>🖼️</span>
                      <span>Pared (Colgado)</span>
                    </button>
                    <button
                      onClick={() => handlePlacementModeChange('shelf')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: placementMode === 'shelf' ? 700 : 500,
                        border:
                          placementMode === 'shelf'
                            ? '1.5px solid var(--accent-primary)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                        background:
                          placementMode === 'shelf'
                            ? 'var(--accent-primary-subtle)'
                            : 'rgba(255, 255, 255, 0.03)',
                        color: placementMode === 'shelf' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>🪵</span>
                      <span>Repisa (Apoyado)</span>
                    </button>
                  </div>
                  {placementMode === 'shelf' && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        fontSize: '10px',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🪵 Sombra de oclusión en base activa (80%) y soporte para apoyar/acostar.</span>
                    </div>
                  )}
                </div>

                {/* 2. Grosor del Cuadro (Espesor 3D con Canto) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Box size={13} color="var(--accent-primary)" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Grosor del Cuadro</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        step="0.5"
                        value={thicknessCm}
                        onChange={(e) => {
                          const v = isNaN(parseFloat(e.target.value)) ? 1.0 : Math.max(1, Math.min(12, parseFloat(e.target.value)));
                          setThicknessCm(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>cm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="12.0"
                    step="0.5"
                    value={thicknessCm}
                    onChange={(e) => setThicknessCm(parseFloat(e.target.value))}
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { label: '1 cm', val: 1.0 },
                      { label: '2 cm', val: 2.0 },
                      { label: '4 cm', val: 4.0 },
                      { label: '8 cm', val: 8.0 },
                      { label: '12 cm', val: 12.0 },
                    ].map((b) => (
                      <button
                        key={b.label}
                        onClick={() => {
                          pushSnapshot();
                          setThicknessCm(b.val);
                        }}
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

                {/* 3. Distancia a la Pared (Atraer / Empujar en Z: 0 a 30 cm) */}
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
                      Distancia a la Pared (Atraer / Empujar)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={zDistance}
                        onChange={(e) => {
                          const v = isNaN(parseFloat(e.target.value)) ? 0 : Math.max(0, Math.min(30, parseFloat(e.target.value)));
                          setZDistance(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: zDistance === 0 ? '#22c55e' : 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>cm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30.0"
                    step="0.5"
                    value={zDistance}
                    onChange={(e) => setZDistance(parseFloat(e.target.value))}
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {[
                      { label: '0 cm (Pared)', val: 0 },
                      { label: '5 cm', val: 5 },
                      { label: '15 cm', val: 15 },
                      { label: '30 cm (Max)', val: 30 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => {
                          pushSnapshot();
                          setZDistance(btn.val);
                        }}
                        style={{
                          padding: '4px',
                          borderRadius: '6px',
                          fontSize: '9.5px',
                          fontWeight: zDistance === btn.val ? 700 : 500,
                          background: zDistance === btn.val ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.04)',
                          border:
                            zDistance === btn.val
                              ? '1px solid var(--accent-primary)'
                              : '1px solid rgba(255,255,255,0.08)',
                          color: zDistance === btn.val ? '#ffffff' : '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Rotación Z (Roll / Diagonal) */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="-45"
                        max="45"
                        value={rollAngle}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-45, Math.min(45, parseInt(e.target.value)));
                          setRollAngle(v);
                        }}
                        style={{
                          width: '42px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>°</span>
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

                {/* 5. Inclinación Vertical (Pitch / Repisa) */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="-75"
                        max="75"
                        value={pitchAngle}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-75, Math.min(75, parseInt(e.target.value)));
                          setPitchAngle(v);
                        }}
                        style={{
                          width: '42px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>º</span>
                    </div>
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
                      onClick={() => {
                        pushSnapshot();
                        setPitchAngle(0);
                      }}
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
                      <RotateCcw size={10} /> 0º (Vertical)
                    </button>
                    <button
                      onClick={() => {
                        pushSnapshot();
                        setPitchAngle(15);
                      }}
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
                      {placementMode === 'shelf' ? 'Apoyado (+15º)' : '+15º Arriba'}
                    </button>
                    <button
                      onClick={() => {
                        pushSnapshot();
                        setPitchAngle(placementMode === 'shelf' ? 35 : -15);
                      }}
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
                      {placementMode === 'shelf' ? 'Inclinado (+35º)' : '-15º Abajo'}
                    </button>
                    <button
                      onClick={() => {
                        pushSnapshot();
                        setPitchAngle(70);
                      }}
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
                      Acostar (70º)
                    </button>
                  </div>
                </div>

                {/* 6. Ángulo Horizontal (Pared) */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="-60"
                        max="60"
                        value={wallAngle}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-60, Math.min(60, parseInt(e.target.value)));
                          setWallAngle(v);
                        }}
                        style={{
                          width: '42px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>º</span>
                    </div>
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
                </div>

                {/* 7. Escala del Cuadro */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Escala del Cuadro</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="5"
                        max="90"
                        value={Math.round(scaleWidth * 100)}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 40 : Math.max(5, Math.min(90, parseInt(e.target.value)));
                          setScaleWidth(v / 100);
                        }}
                        style={{
                          width: '42px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>%</span>
                    </div>
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
              </div>
            )}

            {/* TAB 2: FULL DUAL-DESTINATION PRO COLOR GRADING */}
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
                {/* Destination Selector: Cuadro vs Mockup Fondo */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '4px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <button
                    onClick={() => setAdjustDestination('artwork')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: adjustDestination === 'artwork' ? 700 : 500,
                      border:
                        adjustDestination === 'artwork'
                          ? '1.5px solid var(--accent-primary)'
                          : '1px solid transparent',
                      background:
                        adjustDestination === 'artwork'
                          ? 'var(--accent-primary-subtle)'
                          : 'transparent',
                      color: adjustDestination === 'artwork' ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ImageIcon size={13} />
                    <span>🖼️ Ajustar Cuadro</span>
                  </button>
                  <button
                    onClick={() => setAdjustDestination('background')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: adjustDestination === 'background' ? 700 : 500,
                      border:
                        adjustDestination === 'background'
                          ? '1.5px solid var(--accent-primary)'
                          : '1px solid transparent',
                      background:
                        adjustDestination === 'background'
                          ? 'var(--accent-primary-subtle)'
                          : 'transparent',
                      color: adjustDestination === 'background' ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Home size={13} />
                    <span>🏠 Ajustar Fondo</span>
                  </button>
                </div>

                {/* Subheader info */}
                <div style={{ fontSize: '10.5px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    Grading activo:{' '}
                    <strong style={{ color: 'var(--accent-primary)' }}>
                      {adjustDestination === 'artwork' ? 'Obra de Arte (Cuadro)' : 'Habitación Mockup (Fondo)'}
                    </strong>
                  </span>
                </div>

                {/* 1. Iluminación y Exposición */}
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
                    ☀️ Iluminación & Contraste
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Brillo / Exposición */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Exposición / Brillo</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? brightness : brightnessBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setBrightness(v);
                            else setBrightnessBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? brightness : brightnessBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setBrightness(v);
                          else setBrightnessBg(v);
                        }}
                      />
                    </div>

                    {/* Contraste */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Contraste</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? contrast : contrastBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setContrast(v);
                            else setContrastBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? contrast : contrastBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setContrast(v);
                          else setContrastBg(v);
                        }}
                      />
                    </div>

                    {/* Negros */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Negros</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? blacks : blacksBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setBlacks(v);
                            else setBlacksBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? blacks : blacksBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setBlacks(v);
                          else setBlacksBg(v);
                        }}
                      />
                    </div>

                    {/* Sombras */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Sombras</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? shadowsTone : shadowsToneBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setShadowsTone(v);
                            else setShadowsToneBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? shadowsTone : shadowsToneBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setShadowsTone(v);
                          else setShadowsToneBg(v);
                        }}
                      />
                    </div>

                    {/* Iluminaciones (Highlights) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Iluminaciones (Highlights)</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? highlights : highlightsBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setHighlights(v);
                            else setHighlightsBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? highlights : highlightsBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setHighlights(v);
                          else setHighlightsBg(v);
                        }}
                      />
                    </div>

                    {/* Blancos */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Blancos</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? whites : whitesBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setWhites(v);
                            else setWhitesBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? whites : whitesBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setWhites(v);
                          else setWhitesBg(v);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Color & Tonalidad */}
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
                    🎨 Balance de Blancos & Color
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Temperatura */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Temperatura</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? temperature : temperatureBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setTemperature(v);
                            else setTemperatureBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: (adjustDestination === 'artwork' ? temperature : temperatureBg) > 0 ? '#f59e0b' : (adjustDestination === 'artwork' ? temperature : temperatureBg) < 0 ? '#38bdf8' : '#94a3b8',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? temperature : temperatureBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setTemperature(v);
                          else setTemperatureBg(v);
                        }}
                      />
                    </div>

                    {/* Matiz / Tint */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Tinte (Tint)</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? tint : tintBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setTint(v);
                            else setTintBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: (adjustDestination === 'artwork' ? tint : tintBg) > 0 ? '#de2367' : (adjustDestination === 'artwork' ? tint : tintBg) < 0 ? '#10b981' : '#94a3b8',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? tint : tintBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setTint(v);
                          else setTintBg(v);
                        }}
                      />
                    </div>

                    {/* Saturación */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Saturación</span>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={adjustDestination === 'artwork' ? saturation : saturationBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setSaturation(v);
                            else setSaturationBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustDestination === 'artwork' ? saturation : saturationBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setSaturation(v);
                          else setSaturationBg(v);
                        }}
                      />
                    </div>

                    {/* Tono / Hue */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Tono (Hue)</span>
                        <input
                          type="number"
                          min="-180"
                          max="180"
                          value={adjustDestination === 'artwork' ? hue : hueBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-180, Math.min(180, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setHue(v);
                            else setHueBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={adjustDestination === 'artwork' ? hue : hueBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setHue(v);
                          else setHueBg(v);
                        }}
                      />
                    </div>

                    {/* Viñeta */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Viñeta</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={adjustDestination === 'artwork' ? vignette : vignetteBg}
                          onChange={(e) => {
                            const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value)));
                            if (adjustDestination === 'artwork') setVignette(v);
                            else setVignetteBg(v);
                          }}
                          style={{
                            width: '44px',
                            padding: '1px 4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={adjustDestination === 'artwork' ? vignette : vignetteBg}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (adjustDestination === 'artwork') setVignette(v);
                          else setVignetteBg(v);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    pushSnapshot();
                    if (adjustDestination === 'artwork') {
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
                      setVignette(0);
                      setInvert(false);
                    } else {
                      setTemperatureBg(0);
                      setTintBg(0);
                      setBrightnessBg(0);
                      setContrastBg(0);
                      setHighlightsBg(0);
                      setShadowsToneBg(0);
                      setWhitesBg(0);
                      setBlacksBg(0);
                      setHueBg(0);
                      setSaturationBg(0);
                      setVignetteBg(0);
                      setInvertBg(false);
                    }
                  }}
                  style={{
                    padding: '7px',
                    borderRadius: '8px',
                    fontSize: '10.5px',
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
                  <RotateCcw size={11} /> Resetear Ajustes de {adjustDestination === 'artwork' ? 'Cuadro' : 'Fondo'}
                </button>
              </div>
            )}

            {/* TAB 3: REFLECTION & WEATHER LIGHTING (MULTI-LIGHT 3D SPHERES) */}
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
                {/* 0. Multi-Light 3D Spheres Manager */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sun size={14} color="#f59e0b" />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
                        💡 Focos de Luz Solar 3D
                      </span>
                    </div>
                    <button
                      onClick={handleAddLight}
                      disabled={lightsList.length >= 4}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: lightsList.length < 4 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)',
                        border: lightsList.length < 4 ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                        color: lightsList.length < 4 ? '#fbbf24' : '#64748b',
                        cursor: lightsList.length < 4 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={11} />
                      <span>Añadir Foco</span>
                    </button>
                  </div>

                  {/* Light selector pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {lightsList.map((light, idx) => {
                      const isSel = light.id === activeLightId;
                      return (
                        <div
                          key={light.id}
                          onClick={() => setActiveLightId(light.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '10.5px',
                            fontWeight: isSel ? 700 : 500,
                            background: isSel ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                            border: isSel ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: isSel ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Sun size={11} color={isSel ? '#fbbf24' : '#94a3b8'} />
                          <span>{light.name || `Foco ${idx + 1}`}</span>
                          {lightsList.length > 1 && (
                            <button
                              onClick={(e) => handleRemoveLight(light.id, e)}
                              title="Eliminar este foco"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0 2px',
                                display: 'flex',
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Controls for selected light */}
                  {selectedLight && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#ffffff', marginBottom: '2px' }}>
                          <span>☀️ Intensidad Lumínica ({selectedLight.name || 'Foco'})</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min="0"
                              max="250"
                              value={selectedLight.intensity ?? 100}
                              onChange={(e) => {
                                const v = isNaN(parseInt(e.target.value)) ? 100 : Math.max(0, Math.min(250, parseInt(e.target.value)));
                                setLightsList((prev) =>
                                  prev.map((l) => (l.id === selectedLight.id ? { ...l, intensity: v } : l))
                                );
                                setSunIntensity(v);
                              }}
                              style={{
                                width: '44px',
                                padding: '1px 4px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                color: 'var(--accent-primary)',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '4px',
                                textAlign: 'right',
                              }}
                            />
                            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>%</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="250"
                          step="5"
                          value={selectedLight.intensity ?? 100}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            setLightsList((prev) =>
                              prev.map((l) => (l.id === selectedLight.id ? { ...l, intensity: v } : l))
                            );
                            setSunIntensity(v);
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#94a3b8', marginBottom: '2px' }}>
                            <span>Posición X</span>
                            <span>{Math.round(selectedLight.x * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.02"
                            max="0.98"
                            step="0.01"
                            value={selectedLight.x}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setLightsList((prev) =>
                                prev.map((l) => (l.id === selectedLight.id ? { ...l, x: v } : l))
                              );
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#94a3b8', marginBottom: '2px' }}>
                            <span>Posición Y</span>
                            <span>{Math.round(selectedLight.y * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.02"
                            max="0.98"
                            step="0.01"
                            value={selectedLight.y}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setLightsList((prev) =>
                                prev.map((l) => (l.id === selectedLight.id ? { ...l, y: v } : l))
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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
                          onClick={() => {
                            pushSnapshot();
                            setFinishMode(f.id as any);
                          }}
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

                {/* 2. Selector de 4 Ventanales Arquitectónicos Principales */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                    🪟 Ventanal y Fuente de Reflejo HDR
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {REFLECTION_OPTIONS.map((opt) => {
                      const isSel = reflectionType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            pushSnapshot();
                            setReflectionType(opt.id);
                          }}
                          title={opt.description}
                          style={{
                            padding: '6px 2px',
                            borderRadius: '8px',
                            fontSize: '9.5px',
                            fontWeight: isSel ? 700 : 500,
                            border: isSel ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                            background: isSel ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.03)',
                            color: isSel ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            textAlign: 'center',
                            boxShadow: isSel ? '0 0 10px var(--accent-primary-glow)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{opt.icon}</span>
                          <span style={{ lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                            {opt.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Lámpara Cálida (Interruptor Encendido / Apagado) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🏮</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                        Lámpara Cálida (2700K)
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                        Acento de luz cálida combinable con cualquier estilo
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      pushSnapshot();
                      setWarmLampEnabled(!warmLampEnabled);
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      background: warmLampEnabled ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                      border: warmLampEnabled ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: warmLampEnabled ? '#1e1b4b' : '#94a3b8',
                      cursor: 'pointer',
                      boxShadow: warmLampEnabled ? '0 0 12px rgba(245, 158, 11, 0.6)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {warmLampEnabled ? 'Encendida' : 'Apagada'}
                  </button>
                </div>

                {/* 4. Brillo y Contraste de Reflejo */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600 }}>☀️ Brillo de Reflejo</span>
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        value={reflectionBrightness}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-50, Math.min(50, parseInt(e.target.value)));
                          setReflectionBrightness(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={reflectionBrightness}
                      onChange={(e) => setReflectionBrightness(parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600 }}>🌓 Contraste de Reflejo</span>
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        value={reflectionContrast}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-50, Math.min(50, parseInt(e.target.value)));
                          setReflectionContrast(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={reflectionContrast}
                      onChange={(e) => setReflectionContrast(parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600 }}>🔍 Ancho / Escala del Ventanal</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.1"
                        value={reflectionScale}
                        onChange={(e) => {
                          const v = isNaN(parseFloat(e.target.value)) ? 1.0 : Math.max(0.5, Math.min(2.5, parseFloat(e.target.value)));
                          setReflectionScale(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={reflectionScale}
                      onChange={(e) => setReflectionScale(parseFloat(e.target.value))}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600 }}>🌫️ Difuminado de Superficie (Rugosidad)</span>
                      <input
                        type="number"
                        min="0.02"
                        max="0.30"
                        step="0.01"
                        value={reflectionRoughness}
                        onChange={(e) => {
                          const v = isNaN(parseFloat(e.target.value)) ? 0.05 : Math.max(0.02, Math.min(0.30, parseFloat(e.target.value)));
                          setReflectionRoughness(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.30"
                      step="0.01"
                      value={reflectionRoughness}
                      onChange={(e) => setReflectionRoughness(parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {/* 5. Luminaria de Techo Industrial */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>💡</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                        Luminaria de Techo Industrial
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        pushSnapshot();
                        setCeilingLightsEnabled(!ceilingLightsEnabled);
                      }}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: ceilingLightsEnabled ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {ceilingLightsEnabled ? 'Encendidas' : 'Apagadas'}
                    </button>
                  </div>

                  {ceilingLightsEnabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                      {[
                        { id: 'warm', name: '🟠 Cálida', kelvin: '2700K' },
                        { id: 'neutral', name: '⚪ Neutra', kelvin: '4000K' },
                        { id: 'cool', name: '🔵 Fría', kelvin: '6500K' },
                      ].map((t) => {
                        const isSel = ceilingLightTemp === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              pushSnapshot();
                              setCeilingLightTemp(t.id as any);
                            }}
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
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{t.name}</span>
                            <span style={{ fontSize: '8.5px', opacity: 0.7 }}>{t.kelvin}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 6. Armonización Inteligente (Smart Match) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>🎛️</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                        Armonización Inteligente (Smart Match)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={wallHarmonization}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value)));
                          setWallHarmonization(v);
                        }}
                        style={{
                          width: '42px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={wallHarmonization}
                    onChange={(e) => setWallHarmonization(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: SHADOWS (DUAL-DIRECTION & PROJECTION DISTANCE) */}
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
                {/* 1. Dirección en Ángulo (0° a 360°) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                      🧭 Dirección de Sombra (Ángulo 360°)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="360"
                        value={shadowAngleDeg}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(0, Math.min(360, parseInt(e.target.value)));
                          setShadowAngleDeg(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>°</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={shadowAngleDeg}
                    onChange={(e) => setShadowAngleDeg(parseInt(e.target.value))}
                    style={{ marginBottom: '6px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { label: '0°', val: 0 },
                      { label: '90° (Abajo)', val: 90 },
                      { label: '135° (Diag)', val: 135 },
                      { label: '180° (Izq)', val: 180 },
                      { label: '270° (Arr)', val: 270 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => {
                          pushSnapshot();
                          setShadowAngleDeg(btn.val);
                        }}
                        style={{
                          padding: '3px 2px',
                          borderRadius: '6px',
                          fontSize: '9.5px',
                          fontWeight: shadowAngleDeg === btn.val ? 700 : 500,
                          background: shadowAngleDeg === btn.val ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.04)',
                          border: shadowAngleDeg === btn.val ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                          color: shadowAngleDeg === btn.val ? '#ffffff' : '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Desplazamiento Manual Dual: Horizontal (X) y Vertical (Y) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#ffffff', marginBottom: '2px' }}>
                      <span>↔ Desplazamiento X</span>
                      <input
                        type="number"
                        min="-100"
                        max="100"
                        value={shadowOffsetX}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                          setShadowOffsetX(v);
                        }}
                        style={{
                          width: '42px',
                          padding: '1px 4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={shadowOffsetX}
                      onChange={(e) => setShadowOffsetX(parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#ffffff', marginBottom: '2px' }}>
                      <span>↕ Desplazamiento Y</span>
                      <input
                        type="number"
                        min="-100"
                        max="100"
                        value={shadowOffsetY}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(-100, Math.min(100, parseInt(e.target.value)));
                          setShadowOffsetY(v);
                        }}
                        style={{
                          width: '42px',
                          padding: '1px 4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={shadowOffsetY}
                      onChange={(e) => setShadowOffsetY(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                {/* 3. Distancia de Proyección (0 a 100) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                        📏 Distancia de Proyección
                      </span>
                      {shadowDistance === 0 && (
                        <span style={{ fontSize: '9.5px', color: '#22c55e', marginLeft: '6px' }}>
                          (Pegada al marco / 0 offset)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={shadowDistance}
                      onChange={(e) => {
                        const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value)));
                        setShadowDistance(v);
                      }}
                      style={{
                        width: '44px',
                        padding: '1px 4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: shadowDistance === 0 ? '#22c55e' : 'var(--accent-primary)',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '4px',
                        textAlign: 'right',
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={shadowDistance}
                    onChange={(e) => setShadowDistance(parseInt(e.target.value))}
                  />
                </div>

                {/* 4. Fuerza / Intensidad de Sombra (0% a 100%) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#ffffff' }}>💪 Fuerza de Sombra</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={shadowIntensity}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value)));
                          setShadowIntensity(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={shadowIntensity}
                    onChange={(e) => setShadowIntensity(parseInt(e.target.value))}
                  />
                </div>

                {/* 5. Difuminación / Desenfoque (Blur) (0% a 100%) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#ffffff' }}>
                      🌫️ Difuminación / Desenfoque ({shadowBlur <= 15 ? 'Nítida' : shadowBlur >= 65 ? 'Ultra Difusa' : 'Suave'})
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={shadowBlur}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value)));
                          setShadowBlur(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={shadowBlur}
                    onChange={(e) => setShadowBlur(parseInt(e.target.value))}
                  />
                </div>

                {/* 6. Sombra de Contacto */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#ffffff' }}>
                      {placementMode === 'shelf' ? '🪵 Sombra de Oclusión en Base' : 'Sombra de Contacto'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={shadowContactOcclusion}
                        onChange={(e) => {
                          const v = isNaN(parseInt(e.target.value)) ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value)));
                          setShadowContactOcclusion(v);
                        }}
                        style={{
                          width: '44px',
                          padding: '1px 4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={shadowContactOcclusion}
                    onChange={(e) => setShadowContactOcclusion(parseInt(e.target.value))}
                  />
                </div>
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
