import { FrameType, FinishType, PanelConfig } from '../types/catalog';

export interface RenderFramedCanvasOptions {
  artworkImage: HTMLImageElement;
  frameType?: FrameType;
  finishType: FinishType;
  panelConfig: PanelConfig;
  targetWidth?: number;
}

/**
 * Renders the 1cm Gallery Wrap artwork with its exact natural aspect ratio
 * (The artwork wraps continuously around the 1cm beveled edges).
 */
export function renderFramedCanvas(options: RenderFramedCanvasOptions): HTMLCanvasElement {
  const { artworkImage, finishType, targetWidth = 1400 } = options;

  const artworkAspect = artworkImage.width / artworkImage.height;

  // 1cm edge bevel thickness in pixels
  const edgeThicknessPx = Math.max(Math.round(targetWidth * 0.012), 8);

  const totalWidth = targetWidth;
  const innerWidth = totalWidth - edgeThicknessPx * 2;
  const innerHeight = Math.round(innerWidth / artworkAspect);
  const totalHeight = innerHeight + edgeThicknessPx * 2;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw Gallery Wrap Edge Extension (Artwork continuation)
  ctx.drawImage(artworkImage, 0, 0, totalWidth, totalHeight);

  // Subtle bevel shading on edges (simulating 1cm depth wrap)
  const topGrad = ctx.createLinearGradient(0, 0, 0, edgeThicknessPx);
  topGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  topGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, totalWidth, edgeThicknessPx);

  const bottomGrad = ctx.createLinearGradient(0, totalHeight - edgeThicknessPx, 0, totalHeight);
  bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
  bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, totalHeight - edgeThicknessPx, totalWidth, edgeThicknessPx);

  // 2. Draw Main Front Face
  ctx.drawImage(artworkImage, edgeThicknessPx, edgeThicknessPx, innerWidth, innerHeight);

  // 3. The artwork face stays unmodified. Resin/reflection is rendered by the
  // WebGL compositor as a separate neutral optical layer, never baked into art.
  applySurfaceFinishOverlay(ctx, edgeThicknessPx, edgeThicknessPx, innerWidth, innerHeight, finishType);

  return canvas;
}

function applySurfaceFinishOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  finishType: FinishType
) {
  if (finishType === 'epoxy_resina') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // Ambient Glass Reflection Gradient
    const glassGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    glassGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.05)');
    glassGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.0)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.18)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(x, y, w, h);

    // Diagonal Glass Specular Streak
    const flareGrad = ctx.createLinearGradient(x + w * 0.2, y, x + w * 0.6, y);
    flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
    flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)');
    flareGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = flareGrad;

    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y);
    ctx.lineTo(x + w * 0.55, y);
    ctx.lineTo(x + w * 0.35, y + h);
    ctx.lineTo(x + w * 0.05, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  } else if (finishType === 'satin') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, y, w, h);
  }
}
