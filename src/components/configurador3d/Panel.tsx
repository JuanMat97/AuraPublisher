import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three-stdlib';
import { finishPresets, RESIN_OVERLAY } from './finishPresets';
import { getEdgeTextures, getLuminanceMask } from './textureUtils';
import { loadImageElement } from '../../utils/imageLoader';

const SCALE = 0.01;
const DEPTH = 1;

export interface SizeMetadata {
  w: number;
  h: number;
}

export interface PanelProps {
  textureUrl: string | null;
  finish: string;
  resina?: boolean;
  size: SizeMetadata;
  panelIndex?: number;
  totalPanels?: number;
  gap?: number;
  maskUrl?: string | null;
  stackDirection?: 'horizontal' | 'vertical';
  showAura?: boolean;
  auraScale?: number;
}

/* ─── Soft Ambient Aura Backdrop (Sin Partículas Flotantes) ─── */
function PanelBackdropAura({ width, height, scaleMultiplier = 1 }: { width: number; height: number; scaleMultiplier?: number }) {
  const haloTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      grad.addColorStop(0.5, 'rgba(222, 35, 103, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={[0, 0, -0.015]}>
      {/* Soft Ambient Halo Backdrop */}
      <mesh>
        <planeGeometry args={[width * 1.5 * scaleMultiplier, height * 1.5 * scaleMultiplier]} />
        <meshBasicMaterial
          map={haloTexture}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function Panel({
  textureUrl,
  finish,
  resina = false,
  size,
  panelIndex = 0,
  totalPanels = 1,
  gap = 2,
  maskUrl,
  stackDirection = 'horizontal',
  showAura = true,
  auraScale = 1,
}: PanelProps) {
  const gl = useThree((s) => s.gl);
  const [artwork, setArtwork] = useState<THREE.Texture | null>(null);
  const [edges, setEdges] = useState<THREE.CanvasTexture[] | null>(null);
  const [mask, setMask] = useState<THREE.CanvasTexture | null>(null);

  const fallbackUrl = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80';
  const targetUrl = textureUrl || fallbackUrl;

  useEffect(() => {
    let alive = true;

    const loadTex = async () => {
      try {
        const img = await loadImageElement(targetUrl);
        if (!alive) return;

        const tex = new THREE.CanvasTexture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = gl.capabilities.getMaxAnisotropy();
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;

        if (totalPanels > 1) {
          if (stackDirection === 'vertical') {
            const panelHeightFrac = 1 / totalPanels;
            tex.repeat.set(1, panelHeightFrac);
            tex.offset.set(0, (totalPanels - 1 - panelIndex) * panelHeightFrac);
          } else {
            const panelWidthFrac = 1 / totalPanels;
            tex.repeat.set(panelWidthFrac, 1);
            tex.offset.set(panelIndex * panelWidthFrac, 0);
          }
        } else {
          tex.repeat.set(1, 1);
          tex.offset.set(0, 0);
        }
        tex.needsUpdate = true;
        setArtwork(tex);

        getEdgeTextures(targetUrl, size.w, size.h, DEPTH).then((t) => alive && setEdges(t));
        if (finish === 'tornasolado') {
          if (maskUrl) {
            const mImg = await loadImageElement(maskUrl);
            if (alive && mImg) {
              const c = document.createElement('canvas');
              c.width = mImg.naturalWidth;
              c.height = mImg.naturalHeight;
              const ctx = c.getContext('2d');
              if (ctx) {
                ctx.drawImage(mImg, 0, 0);
                const maskTex = new THREE.CanvasTexture(c);
                maskTex.needsUpdate = true;
                setMask(maskTex);
              }
            }
          } else {
            getLuminanceMask(targetUrl).then((m) => alive && setMask(m));
          }
        }
      } catch (err) {
        console.error('Failed to load panel texture:', err);
      }
    };

    loadTex();
    return () => {
      alive = false;
    };
  }, [targetUrl, totalPanels, panelIndex, stackDirection, finish, maskUrl, size.w, size.h, gl]);

  const w = size.w * SCALE;
  const h = size.h * SCALE;
  const d = DEPTH * SCALE;
  const preset = finishPresets[finish] ?? finishPresets.mate;

  const defaultTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const activeTex = artwork || defaultTex;

  const frontMat = useMemo(() => {
    const p = resina ? { ...preset, ...RESIN_OVERLAY } : preset;
    const mat = new THREE.MeshPhysicalMaterial({
      map: activeTex,
      color: new THREE.Color(p.colorBoost ?? 1, p.colorBoost ?? 1, p.colorBoost ?? 1),
      roughness: p.roughness ?? 0.10,
      clearcoat: p.clearcoat ?? 0.88,
      clearcoatRoughness: p.clearcoatRoughness ?? 0.03,
      iridescence: p.iridescence ?? 0,
      iridescenceIOR: p.iridescenceIOR ?? 1.3,
      iridescenceMap: finish === 'tornasolado' ? mask : null,
      envMapIntensity: p.envMapIntensity ?? 2.2,
      specularIntensity: p.specularIntensity ?? 1.9,
    });
    mat.needsUpdate = true;
    return mat;
  }, [activeTex, preset, resina, mask, finish]);

  const sideMats = useMemo(() => {
    const mk = (tex: THREE.Texture | undefined) => {
      const m = new THREE.MeshStandardMaterial({ map: tex ?? activeTex, roughness: 0.6 });
      m.needsUpdate = true;
      return m;
    };
    return [mk(edges?.[0]), mk(edges?.[1]), mk(edges?.[2]), mk(edges?.[3])];
  }, [edges, activeTex]);

  const backMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#171411', roughness: 0.9 }), []);
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 4, 0.002), [w, h, d]);

  const materials = useMemo(
    () => [sideMats[0], sideMats[1], sideMats[2], sideMats[3], frontMat, backMat],
    [sideMats, frontMat, backMat]
  );

  useEffect(() => () => {
    frontMat.dispose();
    sideMats.forEach((m) => m.dispose());
    backMat.dispose();
  }, [frontMat, sideMats, backMat]);

  const posX = stackDirection === 'vertical' ? 0 : (panelIndex - (totalPanels - 1) / 2) * (w + gap * SCALE);
  const posY = stackDirection === 'vertical' ? ((totalPanels - 1) / 2 - panelIndex) * (h + gap * SCALE) : 0;

  return (
    <group position={[posX, posY, 0]}>
      {showAura && <PanelBackdropAura width={w} height={h} scaleMultiplier={auraScale} />}
      <mesh geometry={geometry} material={materials} castShadow receiveShadow />
    </group>
  );
}
