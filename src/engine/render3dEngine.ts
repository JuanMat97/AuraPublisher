import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { FrameType, FinishType, VinylFinish } from '../types/catalog';
import { getNeutralSurfaceSettings } from './webglRoomEngine';

export interface Render3DOptions {
  artworkImage: HTMLImageElement;
  frameType?: FrameType;
  finishType: FinishType;
  vinylFinish?: VinylFinish;
  hasResina?: boolean;
  reflectionIntensity?: number;
  renderWidth?: number;
  renderHeight?: number;
  rotationY?: number;
  rotationX?: number;
}

/**
 * 3D WebGL Artwork Renderer (Gallery Wrap 1cm Edition):
 * Uses Three.js with MeshPhysicalMaterial, clearcoat reflections, and 1cm depth box geometry.
 */
export function render3DArtworkCanvas(options: Render3DOptions): HTMLCanvasElement {
  const {
    artworkImage,
    finishType,
    renderWidth = 1600,
    renderHeight = 1600,
    rotationY = 0.45,
    rotationX = 0.08,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = renderWidth;
  canvas.height = renderHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });

  renderer.setSize(renderWidth, renderHeight);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, renderWidth / renderHeight, 0.1, 50);
  camera.position.set(0, 0, 3.8);

  // Studio Lighting
  const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.8);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(5, 7, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xfff5ea, 0.6);
  fillLight.position.set(-5, 2, 4);
  scene.add(fillLight);

  // Environment Map for Real Specular Reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const lightformer = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  lightformer.position.set(0, 5, 5);
  envScene.add(lightformer);
  const isResina = options.hasResina ?? finishType === 'epoxy_resina';
  const surface = getNeutralSurfaceSettings(
    options.vinylFinish ?? (finishType === 'epoxy_resina' ? 'brillante' : finishType),
    isResina,
    options.reflectionIntensity ?? 0.2,
  );
  scene.environment = isResina ? pmremGenerator.fromScene(envScene).texture : null;

  // Texture from artwork
  const texture = new THREE.CanvasTexture(artworkImage);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  // Artwork dimensions
  const aspect = artworkImage.width / artworkImage.height;
  let meshW = 1.8;
  let meshH = 1.8;
  if (aspect >= 1) {
    meshH = meshW / aspect;
  } else {
    meshW = meshH * aspect;
  }

  // The emitted art texture remains colour-faithful; resin only adds a neutral clearcoat layer.
  const wrapMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 1,
    roughness: surface.roughness,
    metalness: 0.0,
    clearcoat: surface.clearcoat,
    clearcoatRoughness: surface.clearcoatRoughness,
    ior: 1.54,
    specularIntensity: surface.specularIntensity,
    envMapIntensity: surface.envMapIntensity,
  });

  // 1cm thickness box (depth = 0.04)
  const geom = new RoundedBoxGeometry(meshW, meshH, 0.04, 4, 0.006);
  const mesh = new THREE.Mesh(geom, wrapMaterial);

  mesh.rotation.y = rotationY;
  mesh.rotation.x = rotationX;
  scene.add(mesh);

  renderer.render(scene, camera);

  pmremGenerator.dispose();
  renderer.dispose();

  return canvas;
}
