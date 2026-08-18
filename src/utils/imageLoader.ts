import { generateBuiltinEnvironmentCanvas } from '../engine/builtinAssets';
import { SelectedImage } from '../vite-env';

/**
 * Robustly loads any image source (file path, file://, data:URL, blob:URL, builtin/*) into an HTMLImageElement.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let finalSrc = src;

    if (src.startsWith('builtin/')) {
      const envId = src.replace('builtin/', '').replace(/\.jpg$/, '');
      finalSrc = generateBuiltinEnvironmentCanvas(envId);
    } else if (
      !src.startsWith('data:') &&
      !src.startsWith('http') &&
      !src.startsWith('blob:') &&
      !src.startsWith('file:')
    ) {
      // Local Windows file path like "C:\..." or "H:\..."
      finalSrc = `file:///${src.replace(/\\/g, '/')}`;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.error('Failed to load image:', finalSrc, err);
      reject(new Error(`No se pudo cargar la imagen: ${finalSrc}`));
    };
    img.src = finalSrc;
  });
}

/**
 * Processes a File object dropped or selected by the user into a SelectedImage struct
 */
export function processFileToSelectedImage(file: File): Promise<SelectedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const filePath = (file as any).path || dataUrl;
        resolve({
          path: filePath,
          filename: file.name,
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          format: file.type.split('/')[1] || 'jpg',
        });
      };
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generates sample artwork data URLs for instant testing with vibrant high-res designs
 */
export function getSampleArtwork(type: 'abstract' | 'portrait' | 'landscape'): SelectedImage {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (type === 'abstract') {
    canvas.width = 1800;
    canvas.height = 2400;

    // Deep Navy & Gold Marble
    const bg = ctx.createLinearGradient(0, 0, 1800, 2400);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1800, 2400);

    // Gold Foil Waves
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(200, 400);
    ctx.bezierCurveTo(800, 100, 1000, 1200, 1600, 800);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(100, 1200);
    ctx.bezierCurveTo(700, 2000, 1200, 1400, 1700, 1800);
    ctx.stroke();

    // Gold Circle Accent
    const circleGrad = ctx.createRadialGradient(900, 1200, 100, 900, 1200, 500);
    circleGrad.addColorStop(0, 'rgba(212, 175, 55, 0.9)');
    circleGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.4)');
    circleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = circleGrad;
    ctx.beginPath();
    ctx.arc(900, 1200, 500, 0, Math.PI * 2);
    ctx.fill();

    return {
      path: canvas.toDataURL('image/jpeg', 0.92),
      filename: 'Obra_Abstracta_Dorada_Aura.jpg',
      width: 1800,
      height: 2400,
      aspectRatio: 0.75,
      format: 'jpg',
    };
  } else if (type === 'portrait') {
    canvas.width = 2000;
    canvas.height = 2000;

    // Geometric Modern Art
    ctx.fillStyle = '#171b26';
    ctx.fillRect(0, 0, 2000, 2000);

    // Terracotta & Emerald Shapes
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(600, 600, 450, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.fillRect(900, 800, 800, 900);

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(300, 1800);
    ctx.lineTo(1200, 1000);
    ctx.lineTo(1500, 1800);
    ctx.closePath();
    ctx.fill();

    return {
      path: canvas.toDataURL('image/jpeg', 0.92),
      filename: 'Geométrico_Moderno_Aura.jpg',
      width: 2000,
      height: 2000,
      aspectRatio: 1.0,
      format: 'jpg',
    };
  } else {
    canvas.width = 2400;
    canvas.height = 1200;

    // Panoramic Ocean Resin Waves
    const oceanGrad = ctx.createLinearGradient(0, 0, 2400, 1200);
    oceanGrad.addColorStop(0, '#0284c7');
    oceanGrad.addColorStop(0.5, '#0d9488');
    oceanGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2400, 1200);

    // Foam Streaks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, 600);
    ctx.bezierCurveTo(800, 300, 1600, 900, 2400, 500);
    ctx.stroke();

    return {
      path: canvas.toDataURL('image/jpeg', 0.92),
      filename: 'Panorámico_Océano_Resina.jpg',
      width: 2400,
      height: 1200,
      aspectRatio: 2.0,
      format: 'jpg',
    };
  }
}
