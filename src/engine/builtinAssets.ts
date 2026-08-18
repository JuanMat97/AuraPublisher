// Generates clean architectural background scenes on canvas if local files are absent
export function generateBuiltinEnvironmentCanvas(id: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;

  if (id === 'galeria_moderna') {
    // Galería de Arte Minimalista
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#e2e8f0');
    bgGrad.addColorStop(0.7, '#cbd5e1');
    bgGrad.addColorStop(0.7, '#94a3b8'); // Floor transition
    bgGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1920, 1920);

    // Wall Spotlight Spot
    const spotlight = ctx.createRadialGradient(960, 600, 100, 960, 600, 800);
    spotlight.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    spotlight.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = spotlight;
    ctx.fillRect(0, 0, 1920, 1920);

    // Baseboard line
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 1344, 1920, 12);
  } else if (id === 'living_scandi') {
    // Living Escandinavo
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 1920, 1300); // Wall

    ctx.fillStyle = '#d4a373'; // Wooden floor
    ctx.fillRect(0, 1300, 1920, 620);

    // Sofa representation at bottom
    ctx.fillStyle = '#475569';
    ctx.roundRect(300, 1100, 1320, 500, 40);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.roundRect(350, 1050, 1220, 200, 30);
    ctx.fill();
  } else if (id === 'living_industrial') {
    // Loft Industrial Concreto
    const concGrad = ctx.createLinearGradient(0, 0, 1920, 1920);
    concGrad.addColorStop(0, '#334155');
    concGrad.addColorStop(0.5, '#1e293b');
    concGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = concGrad;
    ctx.fillRect(0, 0, 1920, 1920);

    // Concrete texture noise lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 100);
      ctx.lineTo(1920, i * 100 + 50);
      ctx.stroke();
    }
  } else if (id === 'oficina_executive') {
    // Oficina Ejecutiva
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 1920, 1400);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 1400, 1920, 520); // Floor

    // Minimal Desk
    ctx.fillStyle = '#020617';
    ctx.fillRect(400, 1250, 1120, 400);
  } else {
    // Dormitorio & Hall default
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(0.75, '#e2e8f0');
    bgGrad.addColorStop(0.75, '#b45309'); // Parquet floor
    bgGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1920, 1920);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}
