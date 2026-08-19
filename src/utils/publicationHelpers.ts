import * as XLSX from 'xlsx';
import {
  PublicationType,
  DetectedAspectRatio,
  ADAPTABLE_SIZES,
  AdaptableSize,
  PUBLICATION_FINISHES,
  PublicationFinish,
  PublicationVariant,
} from '../types/publication';

/**
 * Detect aspect ratio from image dimensions:
 * - square: 0.95 <= ratio <= 1.05
 * - horizontal: ratio > 1.05
 * - vertical: ratio < 0.95
 */
export function detectAspectRatio(width: number, height: number): DetectedAspectRatio {
  if (!width || !height) return 'square';
  const ratio = width / height;
  if (ratio >= 0.95 && ratio <= 1.05) return 'square';
  if (ratio > 1.05) return 'horizontal';
  return 'vertical';
}

/**
 * Formats a string to Title Case (e.g. 'pikachu-sunset' -> 'Pikachu Sunset')
 */
export function toTitleCase(str: string): string {
  return str
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => {
      if (!w) return '';
      // Preserve uppercase abbreviations (e.g. GTA, HD, DBZ, 4K)
      if (w.length <= 4 && w === w.toUpperCase() && !/^\d+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Extracts theme and design name from filename
 * Example: 'pokemon-pikachu-sunset.jpg' -> { theme: 'Pokemon', designName: 'Pikachu Sunset' }
 */
export function extractThemeAndDesignFromFilename(filename: string): { theme: string; designName: string } {
  if (!filename) return { theme: 'Arte Moderno', designName: 'Diseño Exclusivo' };

  // Remove extension
  const rawName = filename.replace(/\.[^/.]+$/, '').trim();

  // Try split by common delimiters: " - ", "-", "_", " "
  let parts: string[] = [];
  if (rawName.includes(' - ')) {
    parts = rawName.split(' - ');
  } else if (rawName.includes('-')) {
    parts = rawName.split('-');
  } else if (rawName.includes('_')) {
    parts = rawName.split('_');
  } else {
    parts = [rawName];
  }

  parts = parts.map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const theme = toTitleCase(parts[0]);
    const designName = toTitleCase(parts.slice(1).join(' '));
    return { theme, designName };
  } else if (parts.length === 1) {
    const single = toTitleCase(parts[0]);
    return { theme: single, designName: single };
  }

  return { theme: 'Arte Moderno', designName: 'Diseño Exclusivo' };
}

/**
 * Generates official MercadoLibre publication titles according to Aura Studio guidelines
 */
export function generateAutoPublicationTitle(type: PublicationType, theme: string): string {
  const cleanTheme = (theme || 'Arte Premium').trim();

  switch (type) {
    case 'set':
      return `Set de Cuadros Vinilicos Premium HD ${cleanTheme} Aura Studio`;
    case 'resina':
      return `Cuadro Resina Epoxi Premium HD ${cleanTheme} Aura Studio`;
    case 'personalizado':
      return `Cuadro Personalizado Vinilico Premium HD ${cleanTheme} Aura Studio`;
    case 'individual':
    default:
      return `Cuadro Vinilico Premium HD ${cleanTheme} Aura Studio`;
  }
}

/**
 * Generates default high-converting MercadoLibre publication description template
 */
export function generateDefaultPublicationDescription(params: {
  theme: string;
  designName: string;
  type: PublicationType;
}): string {
  const { theme, designName, type } = params;

  const typeHeader =
    type === 'resina'
      ? 'CUADRO CON ACABADO RESINA EPOXI CRISTAL HD'
      : type === 'set'
      ? 'SET POLÍPTICO DE CUADROS VINÍLICOS HD'
      : type === 'personalizado'
      ? 'CUADRO PERSONALIZADO VINÍLICO HD'
      : 'CUADRO VINÍLICO PREMIUM HD';

  return `✨ AURA STUDIO — EDICIÓN PREMIUM GALERÍA ✨

Diseño: ${designName || theme} (${theme})
Tipo: ${typeHeader}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 CARACTERÍSTICAS DESTACADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Impresión Fine Art Ultra HD de resolución fotográfica profesional (1440 DPI) con tintas ecológicas de pigmento constante.
• Montado sobre bastidor de madera maciza seleccionada de 1 pulgada (2.5 cm de espesor), con terminación de cantos continuos (la imagen envuelve los laterales, listo para colgar sin necesidad de marco exterior).
• Acabados disponibles a elección:
  - Vinilo Mate Antirreflejo: Cero brillos molestos, sobriedad y textura sedosa.
  - Vinilo Brillante: Colores vibrantes y saturación profunda de alto impacto.
  - Holográfico: Destellos tornasolados dinámicos con la iluminación ambiente.
  - Resina Epoxi Cristal: Baño vítreo de 3mm con brillo espejo, profundidad 3D y máxima protección.
• Protección contra rayos UV de por vida: no se decolora ni amarillea con el paso de los años.
• Fácil colocación: Incluye soporte y kit de fijación rápida para pared.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 MEDIDAS Y VARIANTES DISPONIBLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seleccioná tu medida y acabado preferido desde las variantes de esta publicación:
• Opciones individuales y sets polípticos adaptados a la proporción exacta del arte.
• Fabricación 100% artesanal en nuestro taller especializado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 ENVÍOS Y EMBALAJE BLINDADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Embalaje de seguridad multi-capa: Film protector + Pluribol de alta densidad + esquineros rígidos + caja de cartón corrugado reforzado para garantizar que llegue impecable a cualquier punto del país.
• Envíos a todo el país a través de Mercado Envíos.
• Garantía de satisfacción total Aura Studio.

Consultanos cualquier duda, ¡estamos para asesorarte!`;
}

/**
 * Builds all product variants given selected sizes, finishes, base prices, and product metadata
 */
export function buildPublicationVariants(params: {
  selectedSizes: string[];
  selectedFinishes: string[];
  sizePrices: Record<string, number>;
  theme: string;
  designName: string;
  publicationType: PublicationType;
}): PublicationVariant[] {
  const { selectedSizes, selectedFinishes, sizePrices, theme, designName, publicationType } = params;

  const variants: PublicationVariant[] = [];

  const baseSkuPrefix = `AURA-${publicationType.toUpperCase().slice(0, 3)}-${theme.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'ART'}`;

  for (const sizeId of selectedSizes) {
    const sizeObj = ADAPTABLE_SIZES.find((s: AdaptableSize) => s.id === sizeId);
    const sizeLabel = sizeObj ? sizeObj.label : sizeId;
    const basePrice = sizePrices[sizeId] ?? (sizeObj?.defaultPrice || 25900);

    for (const finishId of selectedFinishes) {
      const finishObj = PUBLICATION_FINISHES.find((f) => f.id === finishId);
      const finishLabel = finishObj ? finishObj.name : finishId;
      const surcharge = finishObj ? finishObj.surcharge : 0;
      const finalPrice = basePrice + surcharge;
      const sku = `${baseSkuPrefix}-${sizeId.toUpperCase()}-${finishId.toUpperCase().slice(0, 4)}`;

      const sizeOption = sizeObj || {
        id: sizeId,
        name: sizeLabel,
        label: sizeLabel,
        widthCm: 50,
        heightCm: 70,
        basePrice,
        defaultPrice: basePrice,
        aspectRatio: 'vertical' as const,
        description: sizeLabel,
      };

      variants.push({
        designName,
        finish: finishId as PublicationFinish,
        size: sizeOption,
        price: finalPrice,
        sku,
        stock: 10,
        imagePaths: [],
        sizeId,
        sizeLabel,
        finishId,
        finishLabel,
        basePrice,
        surcharge,
        finalPrice,
      });
    }
  }

  return variants;
}

/**
 * Exports variants and publication data to a MercadoLibre compatible Excel (.xlsx) file
 */
export function exportPublicationToExcel(params: {
  title: string;
  theme: string;
  designName: string;
  publicationType: PublicationType;
  description: string;
  variants: PublicationVariant[];
  outputFolder?: string;
}): { success: boolean; filename: string } {
  const { title, theme, designName, publicationType, description, variants } = params;

  // Sheet 1: Variantes de Publicación
  const rows = variants.map((v, index) => ({
    '#': index + 1,
    'SKU': v.sku,
    'Título Publicación': title,
    'Tema / Franquicia': theme,
    'Diseño': designName,
    'Tipo': publicationType.toUpperCase(),
    'Medida (Variante)': v.sizeLabel,
    'Acabado (Variante)': v.finishLabel,
    'Precio Base ($)': v.basePrice,
    'Recargo Acabado ($)': v.surcharge,
    'Precio Final de Venta ($)': v.finalPrice,
    'Stock Inicial': 99,
    'Condición': 'Nuevo',
    'Disponibilidad Stock (días)': 1,
    'Marca': 'Aura Studio',
    'Modelo': `Cuadro Premium ${theme}`,
    'Temática': theme,
    'Tipo de Cuadro': publicationType === 'set' ? 'Políptico' : 'Panel Único',
  }));

  // Sheet 2: Ficha Técnica & Descripción
  const infoRows = [
    { Campo: 'Título de la Publicación', Valor: title },
    { Campo: 'Límite de Caracteres', Valor: `${title.length} / 60 caracteres` },
    { Campo: 'Tema Principal', Valor: theme },
    { Campo: 'Nombre del Diseño', Valor: designName },
    { Campo: 'Tipo de Publicación', Valor: publicationType },
    { Campo: 'Cantidad de Variantes Generadas', Valor: variants.length },
    { Campo: 'Precio Mínimo', Valor: `$${Math.min(...variants.map((v) => v.finalPrice ?? v.price ?? 0), 0).toLocaleString('es-AR')}` },
    { Campo: 'Precio Máximo', Valor: `$${Math.max(...variants.map((v) => v.finalPrice ?? v.price ?? 0), 0).toLocaleString('es-AR')}` },

    { Campo: 'Descripción MercadoLibre', Valor: description },
  ];

  const workbook = XLSX.utils.book_new();

  const variantsSheet = XLSX.utils.json_to_sheet(rows);
  const infoSheet = XLSX.utils.json_to_sheet(infoRows);

  // Set column widths
  variantsSheet['!cols'] = [
    { wch: 4 },
    { wch: 22 },
    { wch: 45 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
  ];

  infoSheet['!cols'] = [{ wch: 30 }, { wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, variantsSheet, 'Variantes MercadoLibre');
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Ficha y Descripción');

  const safeFilename = `Publicacion_ML_${(theme || 'Aura').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;

  XLSX.writeFile(workbook, safeFilename);

  return { success: true, filename: safeFilename };
}
