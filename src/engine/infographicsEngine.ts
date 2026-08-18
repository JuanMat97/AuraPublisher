import { ProductConfigState } from '../store/appStore';
import { CATALOG_SIZES, CATALOG_FINISHES } from '../types/catalog';

/**
 * Generates the Measures & Technical Specifications Infographic (1920x1920 JPEG)
 */
export function generateMeasuresInfographic(
  framedCanvas: HTMLCanvasElement,
  config: ProductConfigState
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;

  const sizeOpt = CATALOG_SIZES.find((s) => s.id === config.sizeId) || CATALOG_SIZES[0];
  const finishOpt = CATALOG_FINISHES.find((f) => f.id === config.finishId) || CATALOG_FINISHES[0];

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1920);
  bgGrad.addColorStop(0, '#0c1018');
  bgGrad.addColorStop(0.5, '#131826');
  bgGrad.addColorStop(1, '#090b10');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1920, 1920);

  // Glow
  const glow = ctx.createRadialGradient(500, 900, 50, 500, 900, 700);
  glow.addColorStop(0, 'rgba(217, 119, 6, 0.12)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1920, 1920);

  // Header
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('GUÍA DE MEDIDAS & PROPORCIONES', 120, 140);

  ctx.fillStyle = '#d97706';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('AURASTUDIO — DISEÑO & FABRICACIÓN PREMIUM', 120, 185);

  // Draw framed canvas in left area
  const drawW = 820;
  const drawH = Math.round(drawW * (framedCanvas.height / framedCanvas.width));
  const posX = 120;
  const posY = 320 + (1000 - drawH) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  ctx.drawImage(framedCanvas, posX, posY, drawW, drawH);
  ctx.restore();

  // Width Arrow (Top)
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.fillStyle = '#d97706';
  drawDimensionArrow(ctx, posX, posY - 40, posX + drawW, posY - 40);
  ctx.font = 'bold 36px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${sizeOpt.widthCm} cm`, posX + drawW / 2, posY - 60);

  // Height Arrow (Right)
  drawDimensionArrow(ctx, posX + drawW + 40, posY, posX + drawW + 40, posY + drawH);
  ctx.textAlign = 'left';
  ctx.fillText(`${sizeOpt.heightCm} cm`, posX + drawW + 60, posY + drawH / 2);

  // Right Specs Box
  const boxX = 1080;
  const boxY = 300;
  const boxW = 720;
  const boxH = 1050;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.roundRect(boxX, boxY, boxW, boxH, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ESPECIFICACIONES DEL MODELO', boxX + 50, boxY + 80);

  const specs = [
    { label: 'Dimensión Total:', value: sizeOpt.name, detail: sizeOpt.description },
    { label: 'Estructura Bastidor:', value: 'Borde Envolvente 1cm (Gallery Wrap)', detail: 'La imagen continúa por los 4 cantos laterales' },
    { label: 'Acabado de Superficie:', value: finishOpt.name, detail: finishOpt.description },
    { label: 'Protección UV:', value: '100% Anti-decoloración', detail: 'Colores vivos para siempre' },
    { label: 'Listo para colgar:', value: 'Soporte y kit de fijación incluido', detail: 'Instalación en 5 minutos' },
  ];

  let currentY = boxY + 160;
  specs.forEach((item) => {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.label.toUpperCase(), boxX + 50, currentY);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.value, boxX + 50, currentY + 34);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.detail, boxX + 50, currentY + 62);

    currentY += 120;
  });

  ctx.fillStyle = '#d97706';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ COMPRA PROTEGIDA MERCADOLIBRE — GARANTÍA AURASTUDIO DIRECTA DE FÁBRICA', 960, 1840);

  return canvas;
}

/**
 * Generates the Epoxy Resin Benefits Infographic (1920x1920 JPEG)
 */
export function generateResinBenefitsInfographic(
  framedCanvas: HTMLCanvasElement,
  _config: ProductConfigState
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1920);
  bgGrad.addColorStop(0, '#090c14');
  bgGrad.addColorStop(0.5, '#111728');
  bgGrad.addColorStop(1, '#080a10');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1920, 1920);

  const glow = ctx.createRadialGradient(1400, 800, 50, 1400, 800, 800);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1920, 1920);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('¿POR QUÉ ELEGIR ACABADO RESINA EPOXI?', 120, 140);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('EFECTO VIDRIO LÍQUIDO 3D — CALIDAD DE GALERÍA DE ARTE', 120, 185);

  const features = [
    {
      title: '💎 Brillo Espejado Profundo',
      desc: 'Capa vítrea de 2mm que intensifica los negros y duplica la saturación de los colores.',
      x: 120, y: 280,
    },
    {
      title: '☀️ Filtro UV Anti-Decoloración',
      desc: 'No amarillea ni pierde nitidez con el paso de los años, incluso con luz solar directa.',
      x: 1000, y: 280,
    },
    {
      title: '🛡️ Resistencia & Fácil Limpieza',
      desc: 'Superficie sellada a prueba de polvo y humedad. Se limpia con un paño húmedo en segundos.',
      x: 120, y: 520,
    },
    {
      title: '✨ Canto Continuo 1cm',
      desc: 'La imagen dobla en los 4 bordes laterales dando un efecto inmersivo y moderno.',
      x: 1000, y: 520,
    },
  ];

  features.forEach((feat) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.roundRect(feat.x, feat.y, 800, 190, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(feat.title, feat.x + 35, feat.y + 60);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    wrapText(ctx, feat.desc, feat.x + 35, feat.y + 110, 730, 28);
  });

  const drawW = 1100;
  const drawH = Math.round(drawW * (framedCanvas.height / framedCanvas.width));
  const posX = (1920 - drawW) / 2;
  const posY = 820 + (900 - drawH) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 25;
  ctx.drawImage(framedCanvas, posX, posY, drawW, drawH);
  ctx.restore();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ TERMINACIÓN PREMIUM ARTESANAL REALIZADA A MANO — AURASTUDIO', 960, 1840);

  return canvas;
}

function drawDimensionArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const headLength = 15;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + headLength * Math.cos(angle - Math.PI / 6), y1 + headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x1 + headLength * Math.cos(angle + Math.PI / 6), y1 + headLength * Math.sin(angle + Math.PI / 6));
  ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}
