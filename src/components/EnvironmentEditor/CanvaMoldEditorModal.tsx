import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { EnvironmentScene } from '../../types/environment';
import { loadImageElement, getSampleArtwork } from '../../utils/imageLoader';
import { useAppStore } from '../../store/appStore';
import {
  AmbientLightMode,
  ReflectionType,
  REFLECTION_OPTIONS,
  REFLECTION_DIRECTIONS,
  ReflectionDirection,
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
import { X, Check, Move, Sliders, Sun, Layers, Palette, RotateCcw, Target } from 'lucide-react';

interface CanvaMoldEditorModalProps {
  environment: EnvironmentScene;
  onClose: () => void;
}

type EditorTab = 'perspective' | 'color' | 'lighting' | 'shadow';
type DragTarget = 'center' | 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft' | null;

export const CanvaMoldEditorModal: React.FC<CanvaMoldEditorModalProps> = ({ environment, onClose }) => {
  const { selectedImage, artworkSlots, productConfig, setProductConfig, updateEnvironment } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<EditorTab>('perspective');

  const pos = environment.positions[0];
  const initialCenterX = pos?.quad ? (pos.quad.topLeft.x + pos.quad.topRight.x) / 2 : 0.5;
  const initialCenterY = pos?.quad ? (pos.quad.topLeft.y + pos.quad.bottomLeft.y) / 2 : 0.32;
  const initialScale = pos?.quad ? Math.abs(pos.quad.topRight.x - pos.quad.topLeft.x) : 0.35;

  // 1. Spatial & 3D Parameters
  const [centerX, setCenterX] = useState(initialCenterX);
  const [centerY, setCenterY] = useState(initialCenterY);
  const [scaleWidth, setScaleWidth] = useState(Math.max(0.05, Math.min(0.90, initialScale)));
  const [wallAngle, setWallAngle] = useState(pos?.wallAngle ?? productConfig.wallAngle ?? 0);
  const [pitchAngle, setPitchAngle] = useState(pos?.pitchDeg ?? productConfig.pitchDeg ?? 0);

  // Snapping Guidelines State
  const [isSnappedX, setIsSnappedX] = useState(false);
  const [isSnappedY, setIsSnappedY] = useState(false);

  // 2. Lighting & Reflection
  const [lightMode] = useState<AmbientLightMode>(productConfig.lightMode || 'day');
  const [reflectionType, setReflectionType] = useState<ReflectionType>(pos?.reflectionType ?? getReflectionTypeForEnvironment(environment.category));
  const [reflectionDirection, setReflectionDirection] = useState<ReflectionDirection>(pos?.reflectionDirection ?? productConfig.reflectionDirection ?? 'center');
  const [reflectionAngleDeg, setReflectionAngleDeg] = useState(pos?.reflectionAngleDeg ?? productConfig.reflectionAngleDeg ?? 0);
  const [reflectionIntensity, setReflectionIntensity] = useState(pos?.reflectionIntensity ?? productConfig.reflectionIntensity ?? 0.2);
  const [reflectionScale, setReflectionScale] = useState(pos?.reflectionScale ?? productConfig.reflectionScale ?? 1.0);
  const [reflectionRoughness, setReflectionRoughness] = useState(pos?.reflectionRoughness ?? productConfig.reflectionRoughness ?? 0.08);
  const [wallHarmonization, setWallHarmonization] = useState(pos?.wallHarmonization ?? productConfig.wallHarmonization ?? 0.35);
  const [wallSample, setWallSample] = useState<WallLightingSample | null>(null);

  // 3. Full Canva Image Adjustment Suite (Defaults to 0 / Neutral)
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [shadowsTone, setShadowsTone] = useState(0);
  const [whites, setWhites] = useState(0);
  const [blacks, setBlacks] = useState(0);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [invert, setInvert] = useState(false);

  // 4. Auto-Synchronized Shadows
  const [shadowPreset, setShadowPreset] = useState<CanvaShadowPreset>(pos?.shadowPreset ?? productConfig.shadowPreset ?? 'parallel');
  const [shadowBlur, setShadowBlur] = useState(pos?.shadowBlur ?? productConfig.shadowBlur ?? 25);
  const [shadowIntensity, setShadowIntensity] = useState(pos?.shadowStyleIntensity ?? productConfig.shadowIntensity ?? 50);

  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0, origScale: 0, origAngle: 0, origPitch: 0 });

  // On-Screen Vector Pin Coordinates
  const [screenPins, setScreenPins] = useState<{
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    br: { x: number; y: number };
    bl: { x: number; y: number };
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
    rawArtImages: HTMLImageElement[];
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
    rawArtImages: [],
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
    animId: 0,
  });

  const updateEnvironmentLighting = useCallback((
    reflType: ReflectionType,
    reflAngle: number,
    lMode: AmbientLightMode,
    reflInt: number,
    reflScale: number,
    reflRough: number,
    wallHarm: number
  ) => {
    const { scene, frontMaterials, ambLight, keyLight, fillLight, pmremGenerator } = threeState.current;
    if (!scene) return;

    if (pmremGenerator) {
      const envTex = generateRaytracingEquirectangularMap({
        reflectionType: reflType,
        angleDeg: reflAngle,
        intensity: reflInt,
        scale: reflScale,
        lightMode: lMode,
      });
      if (threeState.current.currentEnvRenderTarget) {
        threeState.current.currentEnvRenderTarget.dispose();
      }
      const envRenderTarget = pmremGenerator.fromEquirectangular(envTex);
      envTex.dispose();
      threeState.current.currentEnvRenderTarget = envRenderTarget;
      scene.environment = envRenderTarget.texture;
    }

    const preset = finishPresets[productConfig.vinylFinish] || finishPresets.brillante;
    const p = productConfig.hasResina ? { ...preset, ...RESIN_OVERLAY } : preset;
    const emissiveBoost = p.colorBoost ?? 1.0;

    const roughness = p.roughness;
    const clearcoat = p.clearcoat;
    const clearcoatRoughness = reflRough ?? p.clearcoatRoughness;
    const envMapIntensity = p.envMapIntensity;
    const ior = 1.50;
    const iridescence = p.iridescence ?? 0;
    const iridescenceIOR = p.iridescenceIOR ?? 1.3;
    const specularIntensity = p.specularIntensity ?? (productConfig.hasResina ? 2.2 : 1.4);

    if (wallSample) {
      const neutralColor = new THREE.Color(0xffffff);
      const wallColor = new THREE.Color(wallSample.r, wallSample.g, wallSample.b);
      const ambColor = neutralColor.clone().lerp(wallColor, wallHarm * 0.5);
      const roomLightScale = 0.65 + wallSample.luminance * 0.7;

      if (ambLight) {
        ambLight.color = ambColor;
        ambLight.intensity = 0.4 * (1 - wallHarm * 0.4) + (0.4 * roomLightScale * wallHarm * 0.4);
      }
      if (keyLight) {
        keyLight.color = ambColor;
        keyLight.intensity = 1.3 * (0.6 + 0.4 * roomLightScale);
      }
      if (fillLight) {
        fillLight.intensity = 0.45 * roomLightScale;
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
        mat.ior = ior;
        mat.iridescence = iridescence;
        mat.iridescenceIOR = iridescenceIOR;
        mat.specularIntensity = specularIntensity;
        mat.needsUpdate = true;
      });
    } else {
      frontMaterials.forEach((mat) => {
        mat.color.setRGB(emissiveBoost, emissiveBoost, emissiveBoost);
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 0.1;
        mat.roughness = roughness;
        mat.clearcoat = clearcoat;
        mat.clearcoatRoughness = clearcoatRoughness;
        mat.envMapIntensity = envMapIntensity;
        mat.ior = ior;
        mat.iridescence = iridescence;
        mat.iridescenceIOR = iridescenceIOR;
        mat.specularIntensity = specularIntensity;
        mat.needsUpdate = true;
      });
    }
  }, [productConfig.hasResina, productConfig.vinylFinish, wallSample]);

  const updateArtworkColor = useCallback(() => {
    const { rawArtImages, gradedCanvases, gradedTextures } = threeState.current;
    if (!rawArtImages.length || !gradedCanvases.length) return;

    rawArtImages.forEach((img, idx) => {
      const gCanvas = gradedCanvases[idx];
      const gTex = gradedTextures[idx];
      if (img && gCanvas && gTex) {
        applyCanvaAdjustmentsToCanvas(img, {
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
        }, gCanvas);
        gTex.needsUpdate = true;
      }
    });
  }, [temperature, tint, brightness, contrast, highlights, shadowsTone, whites, blacks, hue, saturation, invert]);

  // 1. Initialize WebGL Scene with Multi-Artwork Diptych / Triptych Support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;

    const initScene = async () => {
      try {
        const envImg = await loadImageElement(environment.imageUrl);

        // Load images for all panels
        const rawArtImages: HTMLImageElement[] = [];
        for (let i = 0; i < panelsCount; i++) {
          let artSource = selectedImage ? selectedImage.path : getSampleArtwork('abstract').path;
          if (productConfig.setMode === 'collection' && artworkSlots[i]) {
            artSource = artworkSlots[i]!.path;
          }
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

        // AuraStudio Professional 3-Point Lighting Rig (Vibrant, Crystal Clear, Photorealistic)
        const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(4, 7, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-4, 3, -3);
        scene.add(fillLight);

        // Prepare Textures & Materials for each panel
        const gradedCanvases: HTMLCanvasElement[] = [];
        const gradedTextures: THREE.CanvasTexture[] = [];
        const frontMaterials: THREE.MeshPhysicalMaterial[] = [];

        const primaryRaw = rawArtImages[0];
        const artAspect = (primaryRaw.naturalWidth || primaryRaw.width || 1) / (primaryRaw.naturalHeight || primaryRaw.height || 1);

        const totalW = bgW * initialScale;
        const totalH = totalW / artAspect;

        const gapM = panelsCount > 1 ? 0.03 : 0;
        const singleW = (totalW - gapM * (panelsCount - 1)) / panelsCount;
        const depthM = 0.009; // Slim 9mm realistic frame profile

        const panelGeom = new RoundedBoxGeometry(singleW, totalH, depthM, 4, 0.001);
        const backMat = new THREE.MeshStandardMaterial({ color: '#0c0d12', roughness: 0.9 });

        const artGroup = new THREE.Group();
        const startX = -totalW / 2 + singleW / 2;
        const artMeshes: THREE.Mesh[] = [];

        for (let i = 0; i < panelsCount; i++) {
          const rawImg = rawArtImages[i] || primaryRaw;
          const gCanvas = document.createElement('canvas');
          applyCanvaAdjustmentsToCanvas(rawImg, {
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
          }, gCanvas);

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

          const preset = finishPresets[productConfig.vinylFinish] || finishPresets.brillante;
          const p = productConfig.hasResina ? { ...preset, ...RESIN_OVERLAY } : preset;
          const emissiveBoost = p.colorBoost ?? 1.0;

          const roughness = p.roughness;
          const clearcoat = p.clearcoat;
          const clearcoatRoughness = reflectionRoughness ?? p.clearcoatRoughness;
          const envMapIntensity = p.envMapIntensity;
          const ior = 1.50;
          const iridescence = p.iridescence ?? 0;
          const iridescenceIOR = p.iridescenceIOR ?? 1.3;
          const specularIntensity = p.specularIntensity ?? (productConfig.hasResina ? 2.2 : 1.4);

          const frontMat = new THREE.MeshPhysicalMaterial({
            map: gTex,
            color: new THREE.Color(emissiveBoost, emissiveBoost, emissiveBoost),
            emissive: new THREE.Color(0xffffff),
            emissiveMap: gTex,
            emissiveIntensity: 0.1,
            roughness: roughness,
            clearcoat: clearcoat,
            clearcoatRoughness: clearcoatRoughness,
            envMapIntensity: envMapIntensity,
            ior: ior,
            iridescence: iridescence,
            iridescenceIOR: iridescenceIOR,
            specularIntensity: specularIntensity,
          });

          // Elegant dark slim edges with subtle specular rim
          const edgeMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.35, metalness: 0.1 });

          frontMaterials.push(frontMat);

          const materials = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];

          const pMesh = new THREE.Mesh(panelGeom, materials);
          pMesh.position.set(startX + i * (singleW + gapM), 0, 0);
          artGroup.add(pMesh);
          artMeshes.push(pMesh);
        }

        scene.add(artGroup);

        // 100% Physically Anchored Frame Drop Shadow
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 1024;
        shadowCanvas.height = 1024;
        const sCtx = shadowCanvas.getContext('2d')!;

        // Automatically sync shadow angle with natural downward gravity and window light
        const autoShadowAngle = 90 + reflectionAngleDeg * 0.5;

        drawExactFrameShadowToContext(sCtx, {
          shadowPreset,
          aspectRatio: totalW / totalH,
          angleDeg: autoShadowAngle,
          distance: 30,
          blur: shadowBlur,
          intensity: shadowIntensity,
          wallAngleDeg: wallAngle,
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
        const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(totalW * 1.8, totalH * 1.8), shadowMat);
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
          rawArtImages,
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
          animId: 0,
        };

        updateEnvironmentLighting(reflectionType, reflectionAngleDeg, lightMode, reflectionIntensity, reflectionScale, reflectionRoughness, wallHarmonization);

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
      if (threeState.current.currentEnvRenderTarget) threeState.current.currentEnvRenderTarget.dispose();
      if (threeState.current.pmremGenerator) threeState.current.pmremGenerator.dispose();
      if (threeState.current.renderer) threeState.current.renderer.dispose();
    };
  }, [environment, selectedImage, artworkSlots, panelsCount, productConfig.setMode, productConfig.vinylFinish, productConfig.hasResina, reflectionIntensity]);

  // 2. Sub-Pixel Accurate 3D Vector Pin Projection (100% Mathematically Locked to Frame Corners)
  useEffect(() => {
    const { artGroup, shadowMesh, camera, bgW, bgH, totalW, totalH } = threeState.current;
    if (!artGroup || !shadowMesh || !camera) return;

    const normX = (centerX - 0.5) * bgW;
    const normY = -(centerY - 0.5) * bgH;
    const scaleFactor = scaleWidth / initialScale;

    artGroup.position.set(normX, normY, 0.04);
    artGroup.scale.set(scaleFactor, scaleFactor, 1);
    artGroup.rotation.y = (wallAngle * Math.PI) / 180;
    artGroup.rotation.x = -(pitchAngle * Math.PI) / 180;

    shadowMesh.position.set(normX, normY, 0.01);
    shadowMesh.scale.set(scaleFactor, scaleFactor, 1);
    shadowMesh.rotation.y = (wallAngle * Math.PI) / 180;
    shadowMesh.rotation.x = -(pitchAngle * Math.PI) / 180;

    artGroup.updateMatrixWorld(true);

    const halfW = totalW / 2;
    const halfH = totalH / 2;

    const localCorners = [
      new THREE.Vector3(-halfW, halfH, 0.005),   // Top-Left
      new THREE.Vector3(halfW, halfH, 0.005),    // Top-Right
      new THREE.Vector3(halfW, -halfH, 0.005),   // Bottom-Right
      new THREE.Vector3(-halfW, -halfH, 0.005),  // Bottom-Left
      new THREE.Vector3(0, 0, 0.005),            // Center
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
      center: projected[4],
    });
  }, [centerX, centerY, scaleWidth, wallAngle, pitchAngle, initialScale]);

  // 3. Dynamic Triggers
  useEffect(() => {
    updateEnvironmentLighting(reflectionType, reflectionAngleDeg, lightMode, reflectionIntensity, reflectionScale, reflectionRoughness, wallHarmonization);
  }, [reflectionType, reflectionAngleDeg, lightMode, reflectionIntensity, reflectionScale, reflectionRoughness, wallHarmonization, updateEnvironmentLighting]);

  useEffect(() => {
    updateArtworkColor();
  }, [updateArtworkColor]);

  // Live Auto-Synchronized Shadow Texture Redraw on Same Canvas
  useEffect(() => {
    const { shadowCanvas, shadowTexture, artAspect } = threeState.current;
    if (shadowCanvas && shadowTexture) {
      const sCtx = shadowCanvas.getContext('2d')!;
      const autoShadowAngle = 90 + reflectionAngleDeg * 0.5;

      drawExactFrameShadowToContext(sCtx, {
        shadowPreset,
        aspectRatio: artAspect,
        angleDeg: autoShadowAngle,
        distance: 30,
        blur: shadowBlur,
        intensity: shadowIntensity,
        wallAngleDeg: wallAngle,
        width: 1024,
        height: 1024,
      });
      shadowTexture.needsUpdate = true;
    }
  }, [shadowPreset, reflectionAngleDeg, shadowBlur, shadowIntensity, wallAngle]);

  // Canva Magnetic Snapping & Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    let hitCorner: DragTarget = null;
    if (screenPins) {
      const pinDist = (p: { x: number; y: number }) => Math.hypot(clickX * 100 - p.x, clickY * 100 - p.y);
      if (pinDist(screenPins.tl) < 6) hitCorner = 'topLeft';
      else if (pinDist(screenPins.tr) < 6) hitCorner = 'topRight';
      else if (pinDist(screenPins.br) < 6) hitCorner = 'bottomRight';
      else if (pinDist(screenPins.bl) < 6) hitCorner = 'bottomLeft';
      else if (pinDist(screenPins.center) < 8) hitCorner = 'center';
    }

    setDragTarget(hitCorner || 'center');

    dragStart.current = {
      x: clickX,
      y: clickY,
      origX: centerX,
      origY: centerY,
      origScale: scaleWidth,
      origAngle: wallAngle,
      origPitch: pitchAngle,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragTarget || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / rect.width;
    const curY = (e.clientY - rect.top) / rect.height;

    const deltaX = curX - dragStart.current.x;
    const deltaY = curY - dragStart.current.y;

    if (dragTarget === 'center') {
      let rawX = dragStart.current.origX + deltaX;
      let rawY = dragStart.current.origY + deltaY;

      // Canva Magnetic Smart Snapping (Center X = 0.5, Standard Hanging Y = 0.32)
      if (Math.abs(rawX - 0.5) < 0.02) {
        rawX = 0.5;
        setIsSnappedX(true);
      } else {
        setIsSnappedX(false);
      }

      if (Math.abs(rawY - 0.32) < 0.02) {
        rawY = 0.32;
        setIsSnappedY(true);
      } else if (Math.abs(rawY - 0.50) < 0.02) {
        rawY = 0.50;
        setIsSnappedY(true);
      } else {
        setIsSnappedY(false);
      }

      setCenterX(Math.min(Math.max(rawX, 0.05), 0.95));
      setCenterY(Math.min(Math.max(rawY, 0.05), 0.95));
    } else if (dragTarget === 'topRight' || dragTarget === 'bottomRight') {
      const newScale = Math.min(Math.max(dragStart.current.origScale + deltaX * 0.8, 0.05), 0.90);
      setScaleWidth(newScale);
      const newAngle = Math.min(Math.max(dragStart.current.origAngle + deltaY * 120, -60), 60);
      setWallAngle(Math.round(newAngle));
    } else if (dragTarget === 'topLeft' || dragTarget === 'bottomLeft') {
      const newScale = Math.min(Math.max(dragStart.current.origScale - deltaX * 0.8, 0.05), 0.90);
      setScaleWidth(newScale);
      const newAngle = Math.min(Math.max(dragStart.current.origAngle - deltaY * 120, -60), 60);
      setWallAngle(Math.round(newAngle));
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
  };

  const handleSave = () => {
    const artAspect = threeState.current.artAspect || 1.0;
    const halfW = scaleWidth / 2;
    const halfH = (scaleWidth / artAspect) / 2;

    const updatedEnv: EnvironmentScene = {
      ...environment,
      positions: [
        {
          ...pos,
          wallAngle,
          pitchDeg: pitchAngle,
          reflectionType,
          reflectionDirection,
          reflectionAngleDeg,
          reflectionIntensity,
          reflectionScale,
          reflectionRoughness,
          wallHarmonization,
          shadowPreset,
          shadowBlur,
          shadowStyleIntensity: shadowIntensity,
          quad: {
            topLeft: { x: centerX - halfW, y: centerY - halfH },
            topRight: { x: centerX + halfW, y: centerY - halfH },
            bottomRight: { x: centerX + halfW, y: centerY + halfH },
            bottomLeft: { x: centerX - halfW, y: centerY + halfH },
          },
        },
      ],
    };

    updateEnvironment(updatedEnv);

    setProductConfig({
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
    });

    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 7, 12, 0.85)',
      backdropFilter: 'blur(28px) saturate(180%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        width: '1120px',
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
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--accent-primary)' }}>
              MOLDE 3D INTELIGENTE
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 390px', gap: '24px', alignItems: 'start' }}>
          {/* Left Canvas with Canva Magnetic Smart Guides */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              position: 'relative',
              background: '#040508',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              userSelect: 'none',
              cursor: dragTarget === 'center' ? 'grabbing' : dragTarget ? 'crosshair' : 'grab',
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

            {/* Canva Magnetic Vertical Guideline (Center X) */}
            {isSnappedX && (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: '1.5px',
                background: '#de2367',
                boxShadow: '0 0 10px #de2367',
                pointerEvents: 'none',
                zIndex: 10,
              }}>
                <span style={{
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
                }}>
                  Centro Horizontal
                </span>
              </div>
            )}

            {/* Canva Magnetic Horizontal Guideline (Standard Y = 32%) */}
            {isSnappedY && (
              <div style={{
                position: 'absolute',
                top: `${centerY * 100}%`,
                left: 0,
                right: 0,
                height: '1.5px',
                background: '#de2367',
                boxShadow: '0 0 10px #de2367',
                pointerEvents: 'none',
                zIndex: 10,
              }}>
                <span style={{
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
                }}>
                  Nivel de Pared Estándar
                </span>
              </div>
            )}

            {/* Vector SVG Quad */}
            {screenPins && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <polygon
                  points={`${screenPins.tl.x}%,${screenPins.tl.y}% ${screenPins.tr.x}%,${screenPins.tr.y}% ${screenPins.br.x}%,${screenPins.br.y}% ${screenPins.bl.x}%,${screenPins.bl.y}%`}
                  fill="rgba(222, 35, 103, 0.05)"
                  stroke="#de2367"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>
            )}

            {/* Corner Handles */}
            {screenPins && (
              <>
                <div style={{ position: 'absolute', left: `${screenPins.tl.x}%`, top: `${screenPins.tl.y}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: '#de2367', border: '2px solid #ffffff', boxShadow: '0 0 8px #de2367', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: `${screenPins.tr.x}%`, top: `${screenPins.tr.y}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: '#de2367', border: '2px solid #ffffff', boxShadow: '0 0 8px #de2367', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: `${screenPins.br.x}%`, top: `${screenPins.br.y}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: '#de2367', border: '2px solid #ffffff', boxShadow: '0 0 8px #de2367', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: `${screenPins.bl.x}%`, top: `${screenPins.bl.y}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: '#de2367', border: '2px solid #ffffff', boxShadow: '0 0 8px #de2367', pointerEvents: 'none' }} />

                <div style={{
                  position: 'absolute',
                  left: `${screenPins.center.x}%`,
                  top: `${screenPins.center.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(222, 35, 103, 0.65)',
                  backdropFilter: 'blur(4px)',
                  border: '1.5px solid #de2367',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  pointerEvents: 'none',
                }}>
                  <Move size={13} />
                </div>
              </>
            )}

            {/* Bottom Tip Bar */}
            <div style={{
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
            }}>
              <span>📍 <strong>Centro</strong>: Mover (Guías magnéticas)</span>
              <span>↔️ <strong>Esquinas</strong>: Escala & Rotación 3D</span>
            </div>
          </div>

          {/* Right Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Pill Tab Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
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

            {/* TAB 1: 3D */}
            {activeTab === 'perspective' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Escala del Cuadro</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.round(scaleWidth * 100)}%</span>
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

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Ángulo Horizontal (Pared)</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>{wallAngle > 0 ? `+${wallAngle}º` : `${wallAngle}º`}</span>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '12px' }}>
                    <button onClick={() => setWallAngle(0)} style={{ padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <RotateCcw size={10} /> 0º
                    </button>
                    <button onClick={() => setWallAngle(35)} style={{ padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                      35º
                    </button>
                    <button onClick={() => setWallAngle(-35)} style={{ padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                      -35º
                    </button>
                    <button onClick={() => setWallAngle(90)} style={{ padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                      Canto
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Inclinación Vertical (Pitch)</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>{pitchAngle > 0 ? `+${pitchAngle}º` : `${pitchAngle}º`}</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    step="1"
                    value={pitchAngle}
                    onChange={(e) => setPitchAngle(parseInt(e.target.value))}
                    style={{ marginBottom: '8px' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    <button onClick={() => setPitchAngle(0)} style={{ padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <RotateCcw size={10} /> Frontal 0º
                    </button>
                    <button onClick={() => setPitchAngle(15)} style={{ padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                      +15º Arriba
                    </button>
                    <button onClick={() => setPitchAngle(-15)} style={{ padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                      -15º Abajo
                    </button>
                  </div>
                </div>

                {/* Armonización Lumínica con la Pared */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>🎨 Integración con la Habitación (Smart Match)</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.round(wallHarmonization * 100)}%</span>
                  </div>
                  <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                    Absorbe automáticamente el tono, calidez y sombras de la pared para fusionar el cuadro como un render fotorrealista.
                  </p>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: wallSample.hexColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: '10px', color: '#cbd5e1' }}>
                          {wallSample.luminance < 0.4 ? 'Ambiente Oscuro / Moody' : wallSample.luminance > 0.75 ? 'Ambiente Luminoso' : 'Ambiente Medio'} ({wallSample.warmth > 1.2 ? 'Cálido' : 'Neutro'})
                        </span>
                      </div>
                      <button
                        onClick={() => setWallHarmonization(0.35)}
                        style={{ padding: '3px 8px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                      >
                        Auto (35%)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FULL CANVA ADJUSTMENT SUITE */}
            {activeTab === 'color' && (
              <div style={{ maxHeight: '420px', overflowY: 'auto', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 1. Balance de Blancos */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: '6px' }}>
                    💡 Balance de Blancos
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Temperatura</span>
                        <span style={{ fontWeight: 700, color: temperature > 0 ? '#f59e0b' : temperature < 0 ? '#38bdf8' : '#94a3b8' }}>{temperature}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={temperature} onChange={(e) => setTemperature(parseInt(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Matiz (Tint)</span>
                        <span style={{ fontWeight: 700, color: tint > 0 ? '#de2367' : tint < 0 ? '#10b981' : '#94a3b8' }}>{tint}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={tint} onChange={(e) => setTint(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>

                {/* 2. Iluminación */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: '6px' }}>
                    ☀️ Iluminación
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Brillo</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{brightness}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Contraste</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{contrast}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Luces (Highlights)</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{highlights}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={highlights} onChange={(e) => setHighlights(parseInt(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Sombras</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{shadowsTone}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={shadowsTone} onChange={(e) => setShadowsTone(parseInt(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Blancos</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{whites}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={whites} onChange={(e) => setWhites(parseInt(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Negros</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{blacks}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={blacks} onChange={(e) => setBlacks(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>

                {/* 3. Color */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: '6px' }}>
                    🎨 Color
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Tono (Hue Rotate)</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{hue}º</span>
                      </div>
                      <input type="range" min="-180" max="180" value={hue} onChange={(e) => setHue(parseInt(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Saturación</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{saturation}</span>
                      </div>
                      <input type="range" min="-100" max="100" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTemperature(0); setTint(0); setBrightness(0); setContrast(0);
                    setHighlights(0); setShadowsTone(0); setWhites(0); setBlacks(0);
                    setHue(0); setSaturation(0); setInvert(false);
                  }}
                  style={{ padding: '6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <RotateCcw size={11} /> Resetear Todos los Ajustes
                </button>
              </div>
            )}

            {/* TAB 3: LIGHTING & REAL WINDOW REFLECTION */}
            {activeTab === 'lighting' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* 1. Rotación 360° del Ventanal */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>🔄 Ángulo del Ventanal (360°)</span>
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
                            padding: '6px 2px',
                            borderRadius: '8px',
                            fontSize: '10px',
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

                {/* 2. Escala & Nitidez del Cristal */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>🔍 Tamaño / Cobertura del Ventanal</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.round(reflectionScale * 100)}%</span>
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
                    <span style={{ fontWeight: 600 }}>✨ Nitidez del Cristal (Efecto Vidrio)</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {reflectionRoughness <= 0.04 ? 'Cristal Ultra Nítido' : reflectionRoughness <= 0.10 ? 'Vidrio / Resina' : reflectionRoughness <= 0.18 ? 'Semibrillo' : 'Satinado'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.25"
                    step="0.01"
                    value={reflectionRoughness}
                    onChange={(e) => setReflectionRoughness(parseFloat(e.target.value))}
                    style={{ marginBottom: '10px' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>💎 Intensidad / Brillo de Resina</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.round(reflectionIntensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={reflectionIntensity}
                    onChange={(e) => setReflectionIntensity(parseFloat(e.target.value))}
                  />
                </div>

                {/* 3. Estilo de Reflejo */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ref.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SHADOWS (AUTO-SYNCHRONIZED) */}
            {activeTab === 'shadow' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          background: '#f43f7e',
                          boxShadow: opt.id === 'parallel' ? '2px 3px 5px rgba(0,0,0,0.8)' : opt.id === 'glow' ? '0 0 6px rgba(0,0,0,0.8)' : opt.id === 'curved' ? '0 4px 3px rgba(0,0,0,0.7)' : 'none',
                        }} />
                        <span>{opt.name}</span>
                      </button>
                    );
                  })}
                </div>

                {shadowPreset !== 'none' && (
                  <>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(222,35,103,0.08)', border: '1px solid rgba(222,35,103,0.2)', fontSize: '10px', color: '#cbd5e1' }}>
                      ⚡ <strong>Sombra Inteligente</strong>: Se orienta automáticamente según la luz del ventanal.
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#ffffff' }}>Suavizado de Sombra (Blur)</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>{shadowBlur}</span>
                      </div>
                      <input type="range" min="0" max="100" value={shadowBlur} onChange={(e) => setShadowBlur(parseInt(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#ffffff' }}>Intensidad / Opacidad</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>{shadowIntensity}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={shadowIntensity} onChange={(e) => setShadowIntensity(parseInt(e.target.value))} />
                    </div>
                  </>
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
