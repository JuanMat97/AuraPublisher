import * as THREE from 'three';

const cache = new Map<string, any>();

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (cache.has('img:' + url)) return cache.get('img:' + url);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    cache.set('img:' + url, img);
    return img;
  } catch {
    return null;
  }
}

export async function getLuminanceMask(url: string): Promise<THREE.CanvasTexture | null> {
  const key = 'mask:' + url;
  if (cache.has(key)) return cache.get(key);
  const img = await loadImage(url);
  if (!img) return null;
  const w = Math.min(img.naturalWidth, 1024);
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    const v = Math.min(255, Math.max(0, (l - 96) * 1.8));
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  cache.set(key, tex);
  return tex;
}

export async function getEdgeTextures(
  url: string,
  panelWidthCm: number = 60,
  panelHeightCm: number = 80,
  panelThicknessCm: number = 1
): Promise<THREE.CanvasTexture[] | null> {
  const key = 'edge:' + url + ':' + panelWidthCm + 'x' + panelHeightCm + 'xd' + panelThicknessCm;
  if (cache.has(key)) return cache.get(key);
  const img = await loadImage(url);
  if (!img) return null;
  const mk = (sx: number, sy: number, sw: number, sh: number, dw: number, dh: number) => {
    const c = document.createElement('canvas');
    c.width = dw;
    c.height = dh;
    c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const horizStripPx = Math.max(4, Math.round((W * panelThicknessCm) / panelWidthCm));
  const vertStripPx = Math.max(4, Math.round((H * panelThicknessCm) / panelHeightCm));
  const out = [
    mk(W - horizStripPx, 0, horizStripPx, H, horizStripPx, 256),
    mk(0, 0, horizStripPx, H, horizStripPx, 256),
    mk(0, 0, W, vertStripPx, 256, vertStripPx),
    mk(0, H - vertStripPx, W, vertStripPx, 256, vertStripPx),
  ];
  cache.set(key, out);
  return out;
}
