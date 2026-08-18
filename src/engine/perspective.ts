import { PerspectiveQuad } from '../types/environment';

/**
 * Draws a source image/canvas onto a destination 2D context using 2-triangle affine perspective warping.
 * Subdivides into a grid (e.g. 16x16) for silky-smooth perspective interpolation without distortion artifacts.
 */
export function drawPerspectiveImage(
  ctx: CanvasRenderingContext2D,
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  quad: PerspectiveQuad,
  destWidth: number,
  destHeight: number,
  gridCols = 16,
  gridRows = 16
) {
  // Convert 0..1 normalized quad coordinates to destination pixel coordinates
  const pTL = { x: quad.topLeft.x * destWidth, y: quad.topLeft.y * destHeight };
  const pTR = { x: quad.topRight.x * destWidth, y: quad.topRight.y * destHeight };
  const pBR = { x: quad.bottomRight.x * destWidth, y: quad.bottomRight.y * destHeight };
  const pBL = { x: quad.bottomLeft.x * destWidth, y: quad.bottomLeft.y * destHeight };

  // Helper bilinear interpolation across the 4 corners
  function getQuadPoint(u: number, v: number) {
    const topX = pTL.x + u * (pTR.x - pTL.x);
    const topY = pTL.y + u * (pTR.y - pTL.y);
    const botX = pBL.x + u * (pBR.x - pBL.x);
    const botY = pBL.y + u * (pBR.y - pBL.y);
    return {
      x: topX + v * (botX - topX),
      y: topY + v * (botY - topY),
    };
  }

  const srcW = sourceImg.width;
  const srcH = sourceImg.height;

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const u0 = c / gridCols;
      const v0 = r / gridRows;
      const u1 = (c + 1) / gridCols;
      const v1 = (r + 1) / gridRows;

      // Source rectangle
      const sx0 = u0 * srcW;
      const sy0 = v0 * srcH;
      const sx1 = u1 * srcW;
      const sy1 = v1 * srcH;

      // Destination quad points for cell
      const pt00 = getQuadPoint(u0, v0);
      const pt10 = getQuadPoint(u1, v0);
      const pt11 = getQuadPoint(u1, v1);
      const pt01 = getQuadPoint(u0, v1);

      // Triangle 1: (pt00, pt10, pt01)
      drawTriangle(ctx, sourceImg, sx0, sy0, sx1, sy0, sx0, sy1, pt00.x, pt00.y, pt10.x, pt10.y, pt01.x, pt01.y);

      // Triangle 2: (pt10, pt11, pt01)
      drawTriangle(ctx, sourceImg, sx1, sy0, sx1, sy1, sx0, sy1, pt10.x, pt10.y, pt11.x, pt11.y, pt01.x, pt01.y);
    }
  }
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  dx0: number, dy0: number,
  dx1: number, dy1: number,
  dx2: number, dy2: number
) {
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(dx0, dy0);
  ctx.lineTo(dx1, dy1);
  ctx.lineTo(dx2, dy2);
  ctx.closePath();
  ctx.clip();

  // Calculate affine matrix [a, b, c, d, e, f]
  const delta = (x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1));
  if (Math.abs(delta) < 0.0001) {
    ctx.restore();
    return;
  }

  const deltaX = dx0 * (y1 - y2) + dx1 * (y2 - y0) + dx2 * (y0 - y1);
  const deltaY = dy0 * (y1 - y2) + dy1 * (y2 - y0) + dy2 * (y0 - y1);

  const a = (dx0 * (y1 - y2) + dx1 * (y2 - y0) + dx2 * (y0 - y1)) / delta;
  const b = (dy0 * (y1 - y2) + dy1 * (y2 - y0) + dy2 * (y0 - y1)) / delta;
  const c = (dx0 * (x2 - x1) + dx1 * (x0 - x2) + dx2 * (x1 - x0)) / delta;
  const d = (dy0 * (x2 - x1) + dy1 * (x0 - x2) + dy2 * (x1 - x0)) / delta;
  const e = (dx0 * (x1 * y2 - x2 * y1) + dx1 * (x2 * y0 - x0 * y2) + dx2 * (x0 * y1 - x1 * y0)) / delta;
  const f = (dy0 * (x1 * y2 - x2 * y1) + dy1 * (x2 * y0 - x0 * y2) + dy2 * (x0 * y1 - x1 * y0)) / delta;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);

  ctx.restore();
}
