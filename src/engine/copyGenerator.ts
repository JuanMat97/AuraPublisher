import type { LibraryTitle } from '../types/publication';

export interface TitleInfoInput {
  titulo: string;
  titulo_original?: string;
  anio?: string | number;
  generos?: string[];
  sinopsis?: string;
  finishType?: string;
}

/**
 * Generates an SEO-optimized title for MercadoLibre with strict 5-stage degradation
 * ensuring 100% guarantee that result.length <= 60 characters.
 *
 * Rules:
 * Resina: `Cuadro Resina Epoxi Premium ${title} Aura Studio`
 * Vinilo: `Cuadro Vinilico Premium HD ${title} Aura Studio`
 * Degradation logic:
 * 1. If len <= 60: return full title.
 * 2. If len > 60: replace "Aura Studio" with "Aura St".
 * 3. If len > 60: remove brand: `Cuadro Vinilico Premium HD ${title}`.
 * 4. If len > 60: remove "Premium": `Cuadro Vinilico HD ${title}`.
 * 5. If len > 60: truncate title cleanly at last word boundary before 60 chars.
 */
export function generateMlSeoTitle(
  title: string,
  category = 'peliculas',
  finish = 'vinilo'
): string {
  const cleanTitle = (title || 'Arte Decorativo').trim().replace(/\s+/g, ' ');
  const isResina =
    finish.toLowerCase().includes('resina') ||
    finish.toLowerCase().includes('epoxy');

  const fullBrand = 'Aura Studio';
  const shortBrand = 'Aura St';

  const fullPrefix = isResina
    ? 'Cuadro Resina Epoxi Premium'
    : 'Cuadro Vinilico Premium HD';

  const noPremiumPrefix = isResina
    ? 'Cuadro Resina Epoxi'
    : 'Cuadro Vinilico HD';

  // Stage 1: Full title with full brand
  const stage1 = `${fullPrefix} ${cleanTitle} ${fullBrand}`.replace(/\s+/g, ' ').trim();
  if (stage1.length <= 60) {
    return stage1;
  }

  // Stage 2: Replace "Aura Studio" with "Aura St"
  const stage2 = `${fullPrefix} ${cleanTitle} ${shortBrand}`.replace(/\s+/g, ' ').trim();
  if (stage2.length <= 60) {
    return stage2;
  }

  // Stage 3: Remove brand completely
  const stage3 = `${fullPrefix} ${cleanTitle}`.replace(/\s+/g, ' ').trim();
  if (stage3.length <= 60) {
    return stage3;
  }

  // Stage 4: Remove "Premium"
  const stage4 = `${noPremiumPrefix} ${cleanTitle}`.replace(/\s+/g, ' ').trim();
  if (stage4.length <= 60) {
    return stage4;
  }

  // Stage 5: Truncate title cleanly at last word boundary before 60 chars
  const candidate = stage4;
  let truncated = candidate.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 20) {
    truncated = truncated.slice(0, lastSpace);
  }

  const finalTitle = truncated.trim().slice(0, 60);
  return finalTitle;
}

/**
 * Generates a high-converting emotional and persuasive MercadoLibre description
 * tailored for movies, series, anime, gaming, and art collector frames.
 */
export function generatePersuasiveDescription(titleInfo: TitleInfoInput): string {
  const {
    titulo,
    titulo_original,
    anio,
    generos,
    sinopsis,
    finishType = 'resina',
  } = titleInfo;

  const cleanTitle = (titulo || 'Obra de Galería').trim();
  const yearStr = anio ? ` (${anio})` : '';
  const originalStr =
    titulo_original && titulo_original.toLowerCase() !== cleanTitle.toLowerCase()
      ? ` • Título original: "${titulo_original}"`
      : '';
  const genreStr =
    generos && generos.length > 0 ? generos.join(' • ') : 'Cine de Culto';

  const isResina =
    finishType.toLowerCase().includes('resina') ||
    finishType.toLowerCase().includes('epoxy');

  // Emotional opening paragraph connecting with passion & cinematic culture
  const synopsisParagraph =
    sinopsis && sinopsis.trim().length > 20
      ? sinopsis.trim()
      : `Reviví la magia, la estética y la adrenalina de una de las obras más emblemáticas en tu propia pared. Una pieza de colección diseñada para transformar cualquier ambiente en una auténtica galería de arte contemporáneo.`;

  return `✨ CUADRO DE COLECCIÓN PREMIUM: ${cleanTitle.toUpperCase()}${yearStr} — AURA STUDIO ✨
${genreStr}${originalStr}

${synopsisParagraph}

Inmortalizá esta pieza en tu setup, sala de estar, estudio o habitación con la más alta calidad de fabricación artesanal y tecnología de impresión Fine Art.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 ESPECIFICACIONES TÉCNICAS Y CALIDAD DE GALERÍA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Impresión Fine Art 300 DPI: Máxima resolución fotográfica con tintas ecológicas de pigmentación constante ultra vívida.
• ${isResina ? 'Acabado Resina Epoxi UV Cristalina: Capa de vidrio líquido de 2-3 mm con brillo espejo 3D que realza la profundidad de los negros y satura los colores.' : 'Acabado Vinilo Polimérico Mate Antirreflejo: Textura sedosa sin reflejos molestos de luces directas, ideal para cualquier iluminación.'}
• Bastidor de Madera Maciza Seleccionada de 20 mm: Estructura robusta y liviana con cantos continuos (la imagen envuelve los 4 laterales con efecto inmersivo sin bordes blancos).
• Listo para Colgar: Incluye soporte trasero reforzado y kit de fijación rápida (se coloca en menos de 5 minutos).
• Protección UV Total: Filtro protector que previene la decoloración y el desgaste por el paso del tiempo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 GUÍA DE MEDIDAS DISPONIBLES (Seleccioná en las variantes):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 25 × 25 cm — Ideal para setups gamers, escritorios y repisas
• 40 × 60 cm — Proporción vertical clásica de póster de cine
• 50 × 50 cm — Formato cuadrado moderno y equilibrado
• 50 × 70 cm — Medida estándar dorada de exhibición
• 60 × 40 cm — Formato horizontal estándar para dormitorios
• 70 × 40 cm — Panorámico estilizado para salas y pasillos
• 80 × 45 cm — Proporción 16:9 cinematográfica de alto impacto
• 90 × 50 cm — Formato panorámico XL sobre sofá o cabecera
• 80 × 80 cm — Cuadrado gigante de presencia imponente
• 70 × 100 cm — Formato living XL de pared completa

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 EMBALAJE BLINDADO Y ENVÍOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Embalaje de máxima seguridad: Cada cuadro viaja protegido con cantoneras esquineras rígidas, film alveolar de triple burbuja y caja de cartón corrugado reforzado.
• Envíos rápidos y seguros a todo el país a través de Mercado Envíos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ GARANTÍA Y CONFIANZA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Garantía oficial Aura Studio de 30 días.
• Compra 100% protegida.

¿Tenés alguna consulta sobre medidas o acabados? ¡Escribinos en la sección de preguntas y te asesoramos de inmediato!
AURA STUDIO — Cuadros que inspiran tu espacio.`.trim();
}
