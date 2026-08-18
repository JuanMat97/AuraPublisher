export type ReflectionType = 'studio_grid' | 'side_window' | 'spotlight';

/**
 * Renders an ultra-realistic, crisp liquid glass epoxy resin reflection.
 * Uses 'screen' composite blending with multi-pane window frames,
 * specular catchlights and glass fresnel highlights (identical to architectural photography).
 */
export function applyPhotorealisticWindowReflection(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  type: ReflectionType = 'studio_grid',
  intensity: number = 0.85,
  angleRad: number = 0
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Use 'screen' blending so the window light adds luminosity and specular shine without washing out the colors
  ctx.globalCompositeOperation = 'screen';

  if (type === 'studio_grid') {
    // 🪟 Real Studio Window with Panes & Montantes (Dola AI Reference)
    const winW = w * 0.42;
    const winH = h * 0.72;
    const winX = x + w * 0.48 + Math.sin(angleRad) * w * 0.2;
    const winY = y + h * 0.08;

    // 1. Overall ambient room glass sheen
    const ambientGlass = ctx.createLinearGradient(x, y, x + w, y + h);
    ambientGlass.addColorStop(0, `rgba(255, 255, 255, ${0.35 * intensity})`);
    ambientGlass.addColorStop(0.35, `rgba(255, 255, 255, ${0.08 * intensity})`);
    ambientGlass.addColorStop(0.7, 'rgba(255, 255, 255, 0.0)');
    ambientGlass.addColorStop(1, `rgba(255, 255, 255, ${0.25 * intensity})`);
    ctx.fillStyle = ambientGlass;
    ctx.fillRect(x, y, w, h);

    // 2. High-contrast multi-pane window reflection
    const cols = 2;
    const rows = 3;
    const barThickness = 8;
    const paneW = (winW - barThickness * (cols - 1)) / cols;
    const paneH = (winH - barThickness * (rows - 1)) / rows;

    ctx.save();
    // Skew slightly with perspective angle
    const skew = -0.08 + Math.sin(angleRad) * 0.15;
    ctx.transform(1, 0, skew, 1, 0, 0);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const px = winX + c * (paneW + barThickness);
        const py = winY + r * (paneH + barThickness);

        // Soft outer glow of the window pane
        const glowGrad = ctx.createRadialGradient(
          px + paneW / 2, py + paneH / 2, paneW * 0.1,
          px + paneW / 2, py + paneH / 2, paneW * 0.8
        );
        glowGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`);
        glowGrad.addColorStop(0.6, `rgba(255, 255, 255, ${0.55 * intensity})`);
        glowGrad.addColorStop(1, `rgba(255, 255, 255, ${0.15 * intensity})`);

        ctx.fillStyle = glowGrad;
        ctx.fillRect(px, py, paneW, paneH);

        // Crisp center specular highlight
        const specGrad = ctx.createLinearGradient(px, py, px + paneW, py + paneH);
        specGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intensity})`);
        specGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.75 * intensity})`);
        specGrad.addColorStop(1, `rgba(255, 255, 255, ${0.35 * intensity})`);

        ctx.fillStyle = specGrad;
        ctx.fillRect(px + 2, py + 2, paneW - 4, paneH - 4);
      }
    }
    ctx.restore();

    // 3. Diagonal Sunbeam / Specular Flare across the whole painting
    const flare = ctx.createLinearGradient(x + w * 0.15, y, x + w * 0.75, y + h);
    flare.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
    flare.addColorStop(0.45, `rgba(255, 255, 255, ${0.28 * intensity})`);
    flare.addColorStop(0.55, `rgba(255, 255, 255, ${0.38 * intensity})`);
    flare.addColorStop(0.65, `rgba(255, 255, 255, ${0.18 * intensity})`);
    flare.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = flare;

    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y);
    ctx.lineTo(x + w * 0.65, y);
    ctx.lineTo(x + w * 0.45, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

  } else if (type === 'side_window') {
    // 🌅 Architectural Side Room Natural Light
    const sideSheen = ctx.createLinearGradient(x, y, x + w, y + h * 0.5);
    sideSheen.addColorStop(0, `rgba(255, 255, 255, ${0.75 * intensity})`);
    sideSheen.addColorStop(0.3, `rgba(255, 255, 255, ${0.35 * intensity})`);
    sideSheen.addColorStop(0.6, `rgba(255, 255, 255, ${0.08 * intensity})`);
    sideSheen.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = sideSheen;
    ctx.fillRect(x, y, w, h);

    // Lateral window slats / blinds reflection
    const slatCount = 5;
    const slatH = h / (slatCount * 2);
    for (let s = 0; s < slatCount; s++) {
      const sy = y + s * slatH * 2 + 10;
      const slatGrad = ctx.createLinearGradient(x, sy, x + w * 0.6, sy);
      slatGrad.addColorStop(0, `rgba(255, 255, 255, ${0.45 * intensity})`);
      slatGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = slatGrad;
      ctx.fillRect(x, sy, w * 0.6, slatH);
    }

  } else if (type === 'spotlight') {
    // 💡 High-Gloss Gallery Ceiling Spotlight Flare
    const spotCenterX = x + w * 0.5;
    const spotCenterY = y + h * 0.22;
    const spotRadius = w * 0.65;

    const spot = ctx.createRadialGradient(spotCenterX, spotCenterY, 5, spotCenterX, spotCenterY, spotRadius);
    spot.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intensity})`);
    spot.addColorStop(0.2, `rgba(255, 255, 255, ${0.65 * intensity})`);
    spot.addColorStop(0.5, `rgba(255, 255, 255, ${0.2 * intensity})`);
    spot.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = spot;
    ctx.fillRect(x, y, w, h);
  }

  // Edge Catchlight on top & left (1cm glass rim reflection)
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * intensity})`;
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y, 2, h);

  ctx.restore();
}
