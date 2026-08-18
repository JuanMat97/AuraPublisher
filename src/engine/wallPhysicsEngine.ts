export type RoomLightSource = 'window_left' | 'ceiling' | 'window_right' | 'diffuse';

export interface WallPlacementParams {
  centerX: number; // 0..1 normalized center X on wall photo
  centerY: number; // 0..1 normalized center Y on wall photo
  scaleWidth: number; // 0.2..0.8 normalized width of frame relative to photo
  lightSource: RoomLightSource;
  shadowIntensity: number; // 0..1
  frameDepthCm?: number; // 2..4 cm
}

export interface RenderWallPhysicsOptions {
  envImage: HTMLImageElement;
  framedArtwork: HTMLImageElement | HTMLCanvasElement;
  placement: WallPlacementParams;
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Photorealistic Wall Physics Compositor:
 * - Locks aspect ratio strictly (never distorts artwork)
 * - Renders dual physical shadows (Contact Occlusion + Directional Soft Cast Shadow)
 * - Adds 3D extruded frame bevels with top light catchlight and bottom depth shadow
 * - Adds liquid glass epoxy reflection streak
 */
export function renderPhotorealisticWallComposite(options: RenderWallPhysicsOptions): HTMLCanvasElement {
  const {
    envImage,
    framedArtwork,
    placement,
    canvasWidth = 1920,
    canvasHeight = 1920,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw Background Environment Cover
  drawCoverImage(ctx, envImage, canvasWidth, canvasHeight);

  // 2. Compute Physical Dimensions with Strict Aspect Ratio Lock
  const artworkAspect = framedArtwork.width / framedArtwork.height;
  const frameW = canvasWidth * (placement.scaleWidth || 0.45);
  const frameH = frameW / artworkAspect;

  const posX = canvasWidth * placement.centerX - frameW / 2;
  const posY = canvasHeight * placement.centerY - frameH / 2;

  // 3. Layer 1: Contact Occlusion Shadow (Tight, dark, physical contact with wall)
  ctx.save();
  ctx.shadowColor = `rgba(0, 0, 0, ${(placement.shadowIntensity || 0.5) * 0.9})`;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#000000';
  ctx.fillRect(posX + 2, posY + 2, frameW - 4, frameH - 4);
  ctx.restore();

  // 4. Layer 2: Directional Soft Cast Shadow (Based on room light source)
  const lightConfig = getLightOffset(placement.lightSource, placement.shadowIntensity || 0.5);
  ctx.save();
  ctx.shadowColor = `rgba(0, 0, 0, ${lightConfig.opacity})`;
  ctx.shadowBlur = lightConfig.blur;
  ctx.shadowOffsetX = lightConfig.offsetX;
  ctx.shadowOffsetY = lightConfig.offsetY;
  ctx.fillStyle = '#000000';
  ctx.fillRect(posX + 4, posY + 4, frameW - 8, frameH - 8);
  ctx.restore();

  // 5. Layer 3: 3D Extruded Frame Thickness & Side Bevels
  const depthPx = Math.max(Math.round(frameW * 0.02), 4); // 3cm depth scaled

  // Bottom / Right Depth Shadow edge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(posX + depthPx, posY + depthPx, frameW, frameH);

  // Top Light Catchlight Edge (White reflection line catching room light)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillRect(posX, posY - 2, frameW, 2);

  // Left/Right subtle rim
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(posX - 1, posY, 1, frameH);

  // 6. Layer 4: Draw Framed Artwork in exact position
  ctx.drawImage(framedArtwork, posX, posY, frameW, frameH);

  // 7. Layer 5: Liquid Glass Epoxy Resin Specular Reflection Overlay
  ctx.save();
  ctx.beginPath();
  ctx.rect(posX, posY, frameW, frameH);
  ctx.clip();

  const glassGrad = ctx.createLinearGradient(posX, posY, posX + frameW, posY + frameH);
  glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  glassGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.04)');
  glassGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.0)');
  glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.14)');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(posX, posY, frameW, frameH);

  // Highlight diagonal streak
  const streakGrad = ctx.createLinearGradient(posX + frameW * 0.3, posY, posX + frameW * 0.7, posY);
  streakGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  streakGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
  streakGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = streakGrad;

  ctx.beginPath();
  ctx.moveTo(posX + frameW * 0.35, posY);
  ctx.lineTo(posX + frameW * 0.65, posY);
  ctx.lineTo(posX + frameW * 0.35, posY + frameH);
  ctx.lineTo(posX + frameW * 0.05, posY + frameH);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  return canvas;
}

function getLightOffset(source: RoomLightSource, intensity: number) {
  switch (source) {
    case 'window_left':
      return { offsetX: 22, offsetY: 28, blur: 28, opacity: intensity * 0.75 };
    case 'window_right':
      return { offsetX: -22, offsetY: 28, blur: 28, opacity: intensity * 0.75 };
    case 'ceiling':
      return { offsetX: 0, offsetY: 36, blur: 32, opacity: intensity * 0.85 };
    case 'diffuse':
    default:
      return { offsetX: 0, offsetY: 18, blur: 22, opacity: intensity * 0.65 };
  }
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let renderW = w;
  let renderH = h;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > targetRatio) {
    renderW = h * imgRatio;
    offsetX = (w - renderW) / 2;
  } else {
    renderH = w / imgRatio;
    offsetY = (h - renderH) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
}
