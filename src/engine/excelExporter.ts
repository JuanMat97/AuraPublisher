import * as XLSX from 'xlsx';
import {
  PublicationListing,
  PublicationVariant,
  PublicationFinish,
  PUBLICATION_FINISHES_MAP,
  LibraryTitle,
  PricingConfig,
  ADAPTABLE_SIZES,
  PUBLICATION_FINISHES,
} from '../types/publication';
import { generateMlSeoTitle, generatePersuasiveDescription } from './copyGenerator';
import { toTitleCase } from '../utils/publicationHelpers';


/**
 * MercadoLibre Excel Column Index Definition
 * Matching sheet "Cuadros Decorativos" from Publicar-08-13-09_35_15.xlsx
 */
export const ML_COLUMNS = {
  CATALOG_CODE: 0, // A: Código de catálogo ML
  TITLE: 1, // B: Título (Max 60 chars)
  TITLE_LENGTH: 2, // C: Cantidad de caracteres (Formula =LEN(B...))
  CONDITION: 3, // D: Condición (Nuevo)
  UNIVERSAL_CODE: 4, // E: Código universal de producto
  COLOR_NAME: 5, // F: Varía por: Nombre comercial del color
  FRAME_COLOR: 6, // G: Varía por: Color del armazón
  PHOTOS: 7, // H: Fotos (URLs separadas por espacio)
  SKU: 8, // I: SKU
  STOCK: 9, // J: Stock
  PRICE: 10, // K: Precio [$]
  SALE_FORMAT: 11, // L: Formato de venta (Unidad / Pack)
  PACK_UNITS: 12, // M: Unidades por pack
  DESCRIPTION: 13, // N: Descripción
  SELLER_FEE: 14, // O: Cargo por vender (Formula)
  INSTALLMENTS: 15, // P: Cuotas (No agregar cuotas / Agregar cuotas)
  INSTALLMENTS_COST: 16, // Q: Costo por ofrecer cuotas (Formula)
  SHIPPING_METHOD: 17, // R: Forma de envío (Mercado Envíos)
  SHIPPING_COST: 18, // S: Costo de envío (A cargo del comprador / Ofrecés envío gratis)
  PICKUP: 19, // T: Retiro en persona (Acepto / No acepto)
  WARRANTY_TYPE: 20, // U: Tipo de garantía (Garantía del vendedor)
  WARRANTY_TIME: 21, // V: Tiempo de garantía (30)
  WARRANTY_TIME_UNIT: 22, // W: Unidad de Tiempo de garantía (días)
  AVAILABILITY_DAYS: 23, // X: Tiempo de disponibilidad del producto (1 a 60 días)
  INVOICE_A: 24, // Y: Factura A (No ofrezco / Ofrezco)
  BRAND: 25, // Z: Marca (AuraStudio)
  MODEL: 26, // AA: Modelo
  THEME: 27, // AB: Temática del cuadro
  HEIGHT: 28, // AC: Altura
  HEIGHT_UNIT: 29, // AD: Unidad de Altura (cm)
  WIDTH: 30, // AE: Ancho
  WIDTH_UNIT: 31, // AF: Unidad de Ancho (cm)
  PANEL_TYPE: 32, // AG: Tipo de panel (Panel único, Díptico, Tríptico, Políptico)
  FRAME: 33, // AH: Marco (No / Sí)
  FRAME_THICKNESS: 34, // AI: Espesor del marco (1)
  FRAME_THICKNESS_UNIT: 35, // AJ: Unidad de Espesor del marco (cm)
  FRAME_MATERIAL: 36, // AK: Material del marco (Madera)
  GLASS: 37, // AL: Vidrio (No / Sí)
  PHRASES: 38, // AM: Frases (No / Sí)
  ERROR_SUMMARY: 39, // AN: Resumen de errores (Formula)
  BUYBOX_FORMULA: 40, // AO: BUYBOX_FORMULA (Formula)
  HIDDEN_PICTURES: 41, // AP: HIDDEN_PICTURES
} as const;

export const ML_SHEET_NAME = 'Cuadros Decorativos';

export const DEFAULT_TEMPLATE_PATHS = [
  'H:/AuraStudio/Publicar-08-13-09_35_15.xlsx',
  'H:/Projects/AuraPublisher/public/templates/Publicar-08-13-09_35_15.xlsx',
  'H:/Projects/AuraPublisher/src/assets/templates/Publicar-08-13-09_35_15.xlsx',
  '/templates/Publicar-08-13-09_35_15.xlsx',
];

export interface MlRowData {
  catalogCode: string;
  title: string;
  titleLength: number;
  condition: string;
  universalCode: string;
  colorName: string;
  frameColor: string;
  photos: string;
  sku: string;
  stock: number;
  price: number;
  saleFormat: string;
  packUnits: number;
  description: string;
  sellerFee: string;
  installments: string;
  installmentsCost: string;
  shippingMethod: string;
  shippingCost: string;
  pickup: string;
  warrantyType: string;
  warrantyTime: number;
  warrantyTimeUnit: string;
  availabilityDays: number;
  invoiceA: string;
  brand: string;
  model: string;
  theme: string;
  height: number;
  heightUnit: string;
  width: number;
  widthUnit: string;
  panelType: string;
  frame: string;
  frameThickness: number;
  frameThicknessUnit: string;
  frameMaterial: string;
  glass: string;
  phrases: string;
}

export interface ExportPublicationOptions {
  listing: PublicationListing;
  outputDir: string;
  templatePath?: string;
  filename?: string;
  cleanUnusedRows?: boolean;
}

export interface ExportPublicationResult {
  success: boolean;
  filePath: string;
  filename: string;
  rowsCount: number;
  totalVariants: number;
  buffer?: Uint8Array;
  error?: string;
}

/**
 * Sanitize filename for cross-platform OS filesystem
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

/**
 * Resolve panel type name for MercadoLibre dropdown
 */
export function resolveMlPanelType(
  type: PublicationListing['type'],
  dimensionId?: string
): string {
  if (type === 'set') {
    if (dimensionId && (dimensionId.includes('trip') || dimensionId.includes('triptych'))) {
      return 'Tríptico';
    }
    if (dimensionId && (dimensionId.includes('dip') || dimensionId.includes('diptych'))) {
      return 'Díptico';
    }
    return 'Políptico';
  }
  return 'Panel único';
}

/**
 * Resolve model name for MercadoLibre
 */
export function resolveMlModelName(
  type: PublicationListing['type'],
  customModel?: string
): string {
  if (customModel && customModel.trim()) return customModel.trim();
  switch (type) {
    case 'resina':
      return 'Cuadro Resina Epoxi Ultra Gloss';
    case 'set':
      return 'Set Políptico Decorativo';
    case 'personalizado':
      return 'Cuadro Personalizado Alta Definición';
    case 'individual':
    default:
      return 'Cuadro Decorativo Premium';
  }
}

/**
 * Resolves commercial variant color name for MercadoLibre
 */
export function resolveMlColorName(
  variant: PublicationVariant,
  totalVariants: number
): string {
  const finishKey = ((variant.finish || variant.finishId || 'mate') as PublicationFinish);
  const finishMeta = PUBLICATION_FINISHES_MAP[finishKey];
  const finishName = finishMeta ? finishMeta.name : (variant.finishLabel || variant.finishId || 'Mate');

  const widthCm = variant.size?.widthCm ?? parseInt(variant.sizeId?.split('x')[0] || '60', 10);
  const heightCm = variant.size?.heightCm ?? parseInt(variant.sizeId?.split('x')[1] || '40', 10);
  const sizeName = variant.sizeLabel || `${widthCm}x${heightCm} cm`;

  if (variant.designName && variant.designName.trim()) {
    if (totalVariants > 1) {
      return `${variant.designName} - ${finishName} (${sizeName})`.slice(0, 50);
    }
    return `${variant.designName} - ${finishName}`.slice(0, 50);
  }

  return `${finishName} - ${sizeName}`.slice(0, 50);
}

/**
 * Generates structured row data for MercadoLibre sheet
 */
export function generateMlRowData(
  listing: PublicationListing,
  variant: PublicationVariant,
  index = 0,
  totalVariants = listing.variants.length
): MlRowData {
  const title = (listing.title || 'Cuadro Decorativo AuraStudio').trim().slice(0, 60);
  const freeShippingLimit = listing.freeShippingThreshold ?? 30000;
  const variantPrice = Math.round(variant.finalPrice ?? variant.price ?? variant.basePrice ?? 24900);
  const shippingCost =
    variantPrice >= freeShippingLimit
      ? 'Ofrecés envío gratis'
      : 'A cargo del comprador';

  const finishKey = ((variant.finish || variant.finishId || 'mate') as string);
  const widthCm = variant.size?.widthCm ?? parseInt(variant.sizeId?.split('x')[0] || '60', 10);
  const heightCm = variant.size?.heightCm ?? parseInt(variant.sizeId?.split('x')[1] || '40', 10);
  const defaultSku = `AURA-${finishKey.toUpperCase().slice(0, 4)}-${widthCm}X${heightCm}-${String(index + 1).padStart(2, '0')}`;
  
  const photos = Array.isArray(variant.imagePaths)
    ? variant.imagePaths.filter(Boolean).join(' ')
    : '';

  const variantStock = (variant.stock && variant.stock > 0) ? variant.stock : 99;

  return {
    catalogCode: '',
    title,
    titleLength: title.length,
    condition: 'Nuevo',
    universalCode: 'El producto no tiene código registrado',
    colorName: resolveMlColorName(variant, totalVariants),
    frameColor: 'Escribí o elegí un valor',
    photos,
    sku: variant.sku ? variant.sku.trim() : defaultSku,
    stock: variantStock,
    price: variantPrice,
    saleFormat: 'Unidad',
    packUnits: 1,
    description: listing.description || '',
    sellerFee: '14.3%',
    installments: 'No agregar cuotas',
    installmentsCost: 'Sin costo',
    shippingMethod: 'Mercado Envíos',
    shippingCost,
    pickup: 'Acepto',
    warrantyType: 'Garantía del vendedor',
    warrantyTime: listing.warrantyDays ?? 30,
    warrantyTimeUnit: 'días',
    availabilityDays: listing.manufacturingDays ?? 2,
    invoiceA: 'No ofrezco',
    brand: (listing.brand || 'AuraStudio').trim(),
    model: resolveMlModelName(listing.type, listing.model),
    theme: (listing.theme || 'Abstracto').trim(),
    height: heightCm,
    heightUnit: 'cm',
    width: widthCm,
    widthUnit: 'cm',
    panelType: resolveMlPanelType(listing.type, variant.size?.id || variant.sizeId || 'single'),
    frame: 'No',
    frameThickness: 1,
    frameThicknessUnit: 'cm',
    frameMaterial: 'Madera',
    glass: 'No',
    phrases: 'No',
  };
}

/**
 * Converts MlRowData to array of cell values matching columns 0..41
 */
export function generateMlRowArray(
  row: MlRowData,
  _excelRowNumber: number
): (string | number | boolean | null)[] {
  const rowArr: (string | number | boolean | null)[] = new Array(42).fill(null);

  rowArr[ML_COLUMNS.CATALOG_CODE] = row.catalogCode;
  rowArr[ML_COLUMNS.TITLE] = row.title;
  rowArr[ML_COLUMNS.TITLE_LENGTH] = row.titleLength;
  rowArr[ML_COLUMNS.CONDITION] = row.condition;
  rowArr[ML_COLUMNS.UNIVERSAL_CODE] = row.universalCode;
  rowArr[ML_COLUMNS.COLOR_NAME] = row.colorName;
  rowArr[ML_COLUMNS.FRAME_COLOR] = row.frameColor;
  rowArr[ML_COLUMNS.PHOTOS] = row.photos;
  rowArr[ML_COLUMNS.SKU] = row.sku;
  rowArr[ML_COLUMNS.STOCK] = row.stock;
  rowArr[ML_COLUMNS.PRICE] = row.price;
  rowArr[ML_COLUMNS.SALE_FORMAT] = row.saleFormat;
  rowArr[ML_COLUMNS.PACK_UNITS] = row.packUnits;
  rowArr[ML_COLUMNS.DESCRIPTION] = row.description;
  rowArr[ML_COLUMNS.SELLER_FEE] = row.sellerFee;
  rowArr[ML_COLUMNS.INSTALLMENTS] = row.installments;
  rowArr[ML_COLUMNS.INSTALLMENTS_COST] = row.installmentsCost;
  rowArr[ML_COLUMNS.SHIPPING_METHOD] = row.shippingMethod;
  rowArr[ML_COLUMNS.SHIPPING_COST] = row.shippingCost;
  rowArr[ML_COLUMNS.PICKUP] = row.pickup;
  rowArr[ML_COLUMNS.WARRANTY_TYPE] = row.warrantyType;
  rowArr[ML_COLUMNS.WARRANTY_TIME] = row.warrantyTime;
  rowArr[ML_COLUMNS.WARRANTY_TIME_UNIT] = row.warrantyTimeUnit;
  rowArr[ML_COLUMNS.AVAILABILITY_DAYS] = row.availabilityDays;
  rowArr[ML_COLUMNS.INVOICE_A] = row.invoiceA;
  rowArr[ML_COLUMNS.BRAND] = row.brand;
  rowArr[ML_COLUMNS.MODEL] = row.model;
  rowArr[ML_COLUMNS.THEME] = row.theme;
  rowArr[ML_COLUMNS.HEIGHT] = row.height;
  rowArr[ML_COLUMNS.HEIGHT_UNIT] = row.heightUnit;
  rowArr[ML_COLUMNS.WIDTH] = row.width;
  rowArr[ML_COLUMNS.WIDTH_UNIT] = row.widthUnit;
  rowArr[ML_COLUMNS.PANEL_TYPE] = row.panelType;
  rowArr[ML_COLUMNS.FRAME] = row.frame;
  rowArr[ML_COLUMNS.FRAME_THICKNESS] = row.frameThickness;
  rowArr[ML_COLUMNS.FRAME_THICKNESS_UNIT] = row.frameThicknessUnit;
  rowArr[ML_COLUMNS.FRAME_MATERIAL] = row.frameMaterial;
  rowArr[ML_COLUMNS.GLASS] = row.glass;
  rowArr[ML_COLUMNS.PHRASES] = row.phrases;
  rowArr[ML_COLUMNS.ERROR_SUMMARY] = '';
  rowArr[ML_COLUMNS.BUYBOX_FORMULA] = '';
  rowArr[ML_COLUMNS.HIDDEN_PICTURES] = null;

  return rowArr;
}

/**
 * Creates a complete standalone fallback MercadoLibre workbook in memory
 * when template file cannot be read from filesystem.
 */
export function createFallbackMlWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Ayuda Sheet
  const wsAyuda = XLSX.utils.aoa_to_sheet([
    [null, 'Ayudas para completar la planilla'],
    [null, 'Publicá varios productos a la vez'],
    [null, 'Completá los datos de lo que quieras vender.'],
  ]);
  XLSX.utils.book_append_sheet(wb, wsAyuda, 'Ayuda');

  // 2. Extra info Sheet (Dropdowns & validations)
  const wsExtra = XLSX.utils.aoa_to_sheet([
    ['3579501153-bulk-sell-38c30c035003', '2026-09-13', '0a07cf2b-7f61-4e1c-b6b6-3e7c98d1480b'],
    ['Nuevo', 'Usado', 'Reacondicionado'],
    ['Escribí o elegí un valor', 'El producto es una pieza artesanal', 'El producto es un kit o un pack', 'El producto no tiene código registrado', 'Otra razón'],
    ['Escribí o elegí un valor', 'Negro', 'Blanco', 'Dorado', 'Plateado', 'Multicolor'],
    ['Escribí o elegí un valor', 'Negro', 'Blanco', 'Madera', 'Dorado'],
    ['Seleccionar', 'Unidad', 'Pack'],
    ['Agregar cuotas', 'No agregar cuotas'],
    ['Mercado Envíos'],
    ['Seleccionar', 'A cargo del comprador', 'Ofrecés envío gratis'],
    ['Seleccionar', 'Acepto', 'No acepto'],
    ['Seleccionar', 'Garantía del vendedor', 'Garantía de fábrica', 'Sin garantía'],
    ['Seleccionar', 'días', 'meses', 'años'],
    ['Seleccionar', 'Ofrezco', 'No ofrezco'],
    ['Escribí o elegí un valor', 'Paisaje', 'Animales', 'Abstracto', 'Mapa', 'Flores'],
    ['Seleccionar', 'cm', 'm', 'mm'],
    ['Seleccionar', 'cm', 'm', 'mm'],
    ['Seleccionar', 'Panel único', 'Díptico', 'Tríptico', 'Cuadríptico', 'Políptico'],
    ['Seleccionar', 'No', 'Sí'],
    ['Seleccionar', '"', 'cm', 'mm'],
    ['Escribí o elegí un valor', 'Aluminio', 'Madera'],
    ['Seleccionar', 'No', 'Sí'],
    ['Seleccionar', 'No', 'Sí'],
  ]);
  XLSX.utils.book_append_sheet(wb, wsExtra, 'extra info');

  // 3. Cuadros Decorativos Sheet
  const headerRows = [
    ['Hogar, Muebles y Jardín > Adornos y Decoración del Hogar > Cuadros, Carteles y Espejos > Cuadros Decorativos'],
    ['Cuadros Decorativos'],
    [
      'Código de catálogo ML',
      'Título: incluí producto, marca, modelo y destaca sus características principales \nSi creás variantes, tenés que crear un título general para todas',
      'Cantidad de caracteres',
      'Condición',
      'Código universal de producto',
      'Varía por: Nombre comercial del color',
      'Varía por: Color del armazón',
      'Fotos',
      'SKU',
      'Stock',
      'Precio [$]',
      'Formato de venta',
      'Unidades por pack',
      'Descripción',
      'Cargo por vender ',
      'Cuotas',
      'Costo por ofrecer cuotas',
      'Forma de envío',
      'Costo de envío',
      'Retiro en persona',
      'Tipo de garantía',
      'Tiempo de garantía',
      'Unidad de Tiempo de garantía',
      'Tiempo de disponibilidad del producto \nCompletá este dato solo si necesitás tiempo para tener tu producto disponible. Son los días corridos que tardás en tener el producto listo para entregar.\n Elegí entre 1 y 60 días.',
      'Factura A',
      'Marca',
      'Modelo',
      'Temática del cuadro',
      'Altura',
      'Unidad de Altura',
      'Ancho',
      'Unidad de Ancho',
      'Tipo de panel',
      'Marco',
      'Espesor del marco',
      'Unidad de Espesor del marco',
      'Material del marco',
      'Vidrio',
      'Frases',
      'Resumen de errores',
      'BUYBOX_FORMULA',
      'HIDDEN_PICTURES',
    ],
    ['', 'Obligatorio', '', 'Obligatorio', 'Obligatorio', 'Obligatorio', '', 'Obligatorio', '', 'Obligatorio', 'Obligatorio', '', '', '', '', 'Obligatorio', '', 'Obligatorio', 'Obligatorio', 'Obligatorio', '', '', '', '', '', 'Obligatorio'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.book_append_sheet(wb, ws, ML_SHEET_NAME);

  return wb;
}

/**
 * Loads MercadoLibre template workbook from filesystem or falls back gracefully
 */
export async function loadMlTemplateWorkbook(
  templatePath?: string
): Promise<XLSX.WorkBook> {
  const pathsToTry = templatePath
    ? [templatePath, ...DEFAULT_TEMPLATE_PATHS]
    : DEFAULT_TEMPLATE_PATHS;

  // 1. Try Node.js fs if available (Node CLI, Electron Main, Tests)
  try {
    const fs = await import('fs');
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        const fileBuffer = fs.readFileSync(p);
        return XLSX.read(fileBuffer, {
          type: 'buffer',
          cellFormula: true,
          cellStyles: true,
        });
      }
    }
  } catch {
    // In browser or sandboxed renderer, ignore fs error
  }

  // 2. Try window.electronAPI if in Electron renderer
  if (typeof window !== 'undefined' && window.electronAPI?.readTemplate) {
    for (const p of pathsToTry) {
      try {
        const res = await window.electronAPI.readTemplate(p);
        if (res.success && res.buffer) {
          return XLSX.read(res.buffer, {
            type: 'array',
            cellFormula: true,
            cellStyles: true,
          });
        }
      } catch {
        // continue to next path
      }
    }
  }

  // 3. Try fetch in browser environment
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    for (const p of ['/templates/Publicar-08-13-09_35_15.xlsx', 'templates/Publicar-08-13-09_35_15.xlsx']) {
      try {
        const response = await fetch(p);
        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          return XLSX.read(arrayBuf, {
            type: 'array',
            cellFormula: true,
            cellStyles: true,
          });
        }
      } catch {
        // continue
      }
    }
  }

  // 4. Ultimate fallback: Build programmatic template
  return createFallbackMlWorkbook();
}

/**
 * Populates worksheet with variants data starting at row 8 (0-indexed row 7)
 */
export function populateMlWorksheet(
  ws: XLSX.WorkSheet,
  listing: PublicationListing,
  cleanUnusedRows = true
): { rowsCount: number } {
  const variants: PublicationVariant[] = listing.variants.length > 0 ? listing.variants : [
    {
      designName: 'Diseño Principal',
      finish: 'mate',
      size: {
        id: 'v_50x70',
        name: '50 × 70 cm',
        widthCm: 50,
        heightCm: 70,
        basePrice: 24900,
        aspectRatio: 'vertical',
      },
      price: 24900,
      sku: 'AURA-MAT-5070-01',
      stock: 10,
      imagePaths: [],
    },
  ];

  const startRowIndex = 7; // Row 8 in Excel (1-indexed)

  variants.forEach((variant: PublicationVariant, i: number) => {
    const r = startRowIndex + i;
    const excelRowNum = r + 1;
    const rowData = generateMlRowData(listing, variant, i, variants.length);

    // Col A: Código de catálogo ML
    ws[`A${excelRowNum}`] = { t: 's', v: rowData.catalogCode };

    // Col B: Título
    ws[`B${excelRowNum}`] = { t: 's', v: rowData.title };

    // Col C: Cantidad de caracteres (preserve formula if existing, or set formula)
    ws[`C${excelRowNum}`] = {
      t: 'n',
      f: `LEN(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1))))`,
      v: rowData.titleLength,
    };

    // Col D: Condición
    ws[`D${excelRowNum}`] = { t: 's', v: rowData.condition };

    // Col E: Código universal de producto
    ws[`E${excelRowNum}`] = { t: 's', v: rowData.universalCode };

    // Col F: Varía por: Nombre comercial del color
    ws[`F${excelRowNum}`] = { t: 's', v: rowData.colorName };

    // Col G: Varía por: Color del armazón
    ws[`G${excelRowNum}`] = { t: 's', v: rowData.frameColor };

    // Col H: Fotos
    ws[`H${excelRowNum}`] = { t: 's', v: rowData.photos };

    // Col I: SKU
    ws[`I${excelRowNum}`] = { t: 's', v: rowData.sku };

    // Col J: Stock
    ws[`J${excelRowNum}`] = { t: 'n', v: rowData.stock };

    // Col K: Precio [$]
    ws[`K${excelRowNum}`] = { t: 'n', v: rowData.price };

    // Col L: Formato de venta
    ws[`L${excelRowNum}`] = { t: 's', v: rowData.saleFormat };

    // Col M: Unidades por pack
    ws[`M${excelRowNum}`] = { t: 'n', v: rowData.packUnits };

    // Col N: Descripción
    ws[`N${excelRowNum}`] = { t: 's', v: rowData.description };

    // Col O: Cargo por vender (preserve formula)
    ws[`O${excelRowNum}`] = {
      t: 's',
      f: `IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(1)))="Agregar cuotas",IF(("14.3%")="","-","14.3%"),IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(1)))="No agregar cuotas",IF(("14.3%")="","-","14.3%"),"-"))`,
      v: rowData.sellerFee,
    };

    // Col P: Cuotas
    ws[`P${excelRowNum}`] = { t: 's', v: rowData.installments };

    // Col Q: Costo por ofrecer cuotas (preserve formula)
    ws[`Q${excelRowNum}`] = {
      t: 's',
      f: `IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1)))="Agregar cuotas",IF(("12.3%")="","Sin costo","12.3%"),IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1)))="No agregar cuotas",IF(("")="","Sin costo",""),"-"))`,
      v: rowData.installmentsCost,
    };

    // Col R: Forma de envío
    ws[`R${excelRowNum}`] = { t: 's', v: rowData.shippingMethod };

    // Col S: Costo de envío
    ws[`S${excelRowNum}`] = { t: 's', v: rowData.shippingCost };

    // Col T: Retiro en persona
    ws[`T${excelRowNum}`] = { t: 's', v: rowData.pickup };

    // Col U: Tipo de garantía
    ws[`U${excelRowNum}`] = { t: 's', v: rowData.warrantyType };

    // Col V: Tiempo de garantía
    ws[`V${excelRowNum}`] = { t: 'n', v: rowData.warrantyTime };

    // Col W: Unidad de Tiempo de garantía
    ws[`W${excelRowNum}`] = { t: 's', v: rowData.warrantyTimeUnit };

    // Col X: Tiempo de disponibilidad del producto
    ws[`X${excelRowNum}`] = { t: 'n', v: rowData.availabilityDays };

    // Col Y: Factura A
    ws[`Y${excelRowNum}`] = { t: 's', v: rowData.invoiceA };

    // Col Z: Marca
    ws[`Z${excelRowNum}`] = { t: 's', v: rowData.brand };

    // Col AA: Modelo
    ws[`AA${excelRowNum}`] = { t: 's', v: rowData.model };

    // Col AB: Temática del cuadro
    ws[`AB${excelRowNum}`] = { t: 's', v: rowData.theme };

    // Col AC: Altura
    ws[`AC${excelRowNum}`] = { t: 'n', v: rowData.height };

    // Col AD: Unidad de Altura
    ws[`AD${excelRowNum}`] = { t: 's', v: rowData.heightUnit };

    // Col AE: Ancho
    ws[`AE${excelRowNum}`] = { t: 'n', v: rowData.width };

    // Col AF: Unidad de Ancho
    ws[`AF${excelRowNum}`] = { t: 's', v: rowData.widthUnit };

    // Col AG: Tipo de panel
    ws[`AG${excelRowNum}`] = { t: 's', v: rowData.panelType };

    // Col AH: Marco
    ws[`AH${excelRowNum}`] = { t: 's', v: rowData.frame };

    // Col AI: Espesor del marco
    ws[`AI${excelRowNum}`] = { t: 'n', v: rowData.frameThickness };

    // Col AJ: Unidad de Espesor del marco
    ws[`AJ${excelRowNum}`] = { t: 's', v: rowData.frameThicknessUnit };

    // Col AK: Material del marco
    ws[`AK${excelRowNum}`] = { t: 's', v: rowData.frameMaterial };

    // Col AL: Vidrio
    ws[`AL${excelRowNum}`] = { t: 's', v: rowData.glass };

    // Col AM: Frases
    ws[`AM${excelRowNum}`] = { t: 's', v: rowData.phrases };

    // Col AN: Resumen de errores
    ws[`AN${excelRowNum}`] = {
      t: 's',
      f: `IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("A"&ROW()))="",INDIRECT("A"&ROW())="Escribí o elegí un valor"))," - Código de catálogo ML","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("D"&ROW()))="",INDIRECT("D"&ROW())="Seleccionar"))," - Condición","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("D"&ROW()))="",INDIRECT("D"&ROW())="Seleccionar"))," - Condición","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("E"&ROW()))="",INDIRECT("E"&ROW())="Escribí o elegí un valor"))," - Código universal de producto","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("E"&ROW()))="",INDIRECT("E"&ROW())="Escribí o elegí un valor"))," - Código universal de producto","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("F"&ROW()))="",INDIRECT("F"&ROW())="Escribí o elegí un valor"))," - Varía por: Nombre comercial del color","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("H"&ROW()))="",INDIRECT("H"&ROW())="Escribí o elegí un valor"))," - Fotos","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("J"&ROW()))="",INDIRECT("J"&ROW())=""))," - Stock","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("J"&ROW()))="",INDIRECT("J"&ROW())=""))," - Stock","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("K"&ROW()))="",INDIRECT("K"&ROW())=""))," - Precio [$]","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("K"&ROW()))="",INDIRECT("K"&ROW())=""))," - Precio [$]","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("P"&ROW()))="",INDIRECT("P"&ROW())="Seleccionar"))," - Cuotas","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("P"&ROW()))="",INDIRECT("P"&ROW())="Seleccionar"))," - Cuotas","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("R"&ROW()))="",INDIRECT("R"&ROW())="Seleccionar"))," - Forma de envío","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("R"&ROW()))="",INDIRECT("R"&ROW())="Seleccionar"))," - Forma de envío","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("S"&ROW()))="",INDIRECT("S"&ROW())="Seleccionar"))," - Costo de envío","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("S"&ROW()))="",INDIRECT("S"&ROW())="Seleccionar"))," - Costo de envío","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("T"&ROW()))="",INDIRECT("T"&ROW())="Seleccionar"))," - Retiro en persona","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("T"&ROW()))="",INDIRECT("T"&ROW())="Seleccionar"))," - Retiro en persona","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("Y"&ROW()))="",INDIRECT("Y"&ROW())="Seleccionar"))," - Factura A","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("Z"&ROW()))="",INDIRECT("Z"&ROW())="Escribí o elegí un valor"))," - Marca","")`,
      v: '',
    };

    // Col AO: BUYBOX_FORMULA
    ws[`AO${excelRowNum}`] = {
      t: 's',
      f: `IF(OR(TRIM(INDIRECT("B"&ROW()))<>"",TRIM(INDIRECT("A"&ROW()))<>""),AND(TRIM(INDIRECT("A"&ROW()))<>"",TRIM(INDIRECT("D"&ROW()))="nuevo"),"")`,
      v: '',
    };
  });

  // Clean empty unused template rows (rows > variants count)
  if (cleanUnusedRows && ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    const lastFilledRowIndex = startRowIndex + variants.length - 1;

    for (let r = lastFilledRowIndex + 1; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        delete ws[cellAddr];
      }
    }

    range.e.r = lastFilledRowIndex;
    ws['!ref'] = XLSX.utils.encode_range(range);
  }

  return { rowsCount: variants.length };
}

/**
 * Builds a populated MercadoLibre Excel workbook in memory
 */
export async function buildMlWorkbook(
  listing: PublicationListing,
  options?: { templatePath?: string; cleanUnusedRows?: boolean }
): Promise<XLSX.WorkBook> {
  const wb = await loadMlTemplateWorkbook(options?.templatePath);
  const sheetName = wb.SheetNames.includes(ML_SHEET_NAME)
    ? ML_SHEET_NAME
    : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  populateMlWorksheet(ws, listing, options?.cleanUnusedRows ?? true);
  return wb;
}

/**
 * Exports PublicationListing to a MercadoLibre formatted Excel (.xlsx) file
 */
export async function exportPublicationToMlExcel(
  options: ExportPublicationOptions
): Promise<ExportPublicationResult> {
  const {
    listing,
    outputDir,
    templatePath,
    cleanUnusedRows = true,
  } = options;

  try {
    const wb = await buildMlWorkbook(listing, { templatePath, cleanUnusedRows });
    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      cellStyles: true,
    }) as Buffer;

    const baseName = sanitizeFilename(listing.title || 'Publicacion_MercadoLibre');
    const filename =
      options.filename || `ML_${baseName}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;

    const normalizedDir = outputDir.replace(/[\\/]+$/, '');
    const targetPath = `${normalizedDir}/${filename}`;

    // 1. Try Node.js fs (Node CLI, Electron main, tests)
    try {
      const fs = await import('fs');
      const pathModule = await import('path');
      const resolvedDir = pathModule.dirname(targetPath);
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, buffer);

      return {
        success: true,
        filePath: targetPath,
        filename,
        rowsCount: listing.variants.length,
        totalVariants: listing.variants.length,
        buffer: new Uint8Array(buffer),
      };
    } catch {
      // In renderer or browser, fallback below
    }

    // 2. Try window.electronAPI.saveBuffer in Electron renderer
    if (typeof window !== 'undefined' && window.electronAPI?.saveBuffer) {
      const res = await window.electronAPI.saveBuffer({
        buffer: new Uint8Array(buffer),
        targetPath,
      });

      if (res.success) {
        return {
          success: true,
          filePath: res.path || targetPath,
          filename,
          rowsCount: listing.variants.length,
          totalVariants: listing.variants.length,
          buffer: new Uint8Array(buffer),
        };
      }
    }

    // 3. Fallback: Browser download / return buffer
    if (typeof window !== 'undefined') {
      XLSX.writeFile(wb, filename);
    }

    return {
      success: true,
      filePath: targetPath,
      filename,
      rowsCount: listing.variants.length,
      totalVariants: listing.variants.length,
      buffer: new Uint8Array(buffer),
    };
  } catch (error: any) {
    console.error('Error exporting publication to ML Excel:', error);
    return {
      success: false,
      filePath: '',
      filename: '',
      rowsCount: 0,
      totalVariants: listing.variants.length,
      error: error.message || 'Unknown error occurred during export',
    };
  }
}

export interface ExportMassivePublicationOptions {
  titles: LibraryTitle[];
  pricingConfig: PricingConfig;
  outputDir?: string;
  templatePath?: string;
  filename?: string;
}

/**
 * Massive bulk publisher export for MercadoLibre Excel template
 * Generates variants (Medidas × Acabados) for all selected titles in a single workbook.
 */
export async function exportMassivePublicationToMlExcel(
  options: ExportMassivePublicationOptions
): Promise<{ success: boolean; filePath?: string; filename?: string; totalRows: number; error?: string }> {
  const {
    titles,
    pricingConfig,
    outputDir = 'C:/AuraPublisher_Renders',
    templatePath,
  } = options;

  try {
    const selectedTitles = titles.filter((t) => t.selected !== false);
    const activeTitles = selectedTitles.length > 0 ? selectedTitles : titles;

    if (activeTitles.length === 0) {
      return { success: false, totalRows: 0, error: 'No se seleccionaron títulos para exportar.' };
    }

    const defaultSizes = pricingConfig.defaultSizes || [
      '25x25',
      '40x60',
      '50x50',
      '50x70',
      '60x40',
      '70x40',
      '80x45',
      '90x50',
    ];
    const defaultFinishes = pricingConfig.defaultFinishes || [
      'resina',
      'vinilo_mate',
      'vinilo_brillante',
      'holografico',
    ];

    const wb = await loadMlTemplateWorkbook(templatePath);
    const sheetName = wb.SheetNames.includes(ML_SHEET_NAME)
      ? ML_SHEET_NAME
      : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    let rowIndex = 7; // Row 8 in Excel (1-indexed)
    let totalGeneratedRows = 0;

    for (const titleItem of activeTitles) {
      const finishType = titleItem.finishType || 'resina';
      const category = titleItem.category || 'peliculas';
      const seoTitle = (
        titleItem.seoTitle ||
        generateMlSeoTitle(titleItem.titulo, category, finishType)
      )
        .trim()
        .slice(0, 60);

      const sizesToUse =
        titleItem.availableSizes && titleItem.availableSizes.length > 0
          ? titleItem.availableSizes
          : defaultSizes;

      const finishesToUse = defaultFinishes;

      const description = generatePersuasiveDescription({
        titulo: titleItem.titulo,
        titulo_original: titleItem.titulo_original,
        anio: titleItem.anio,
        generos: titleItem.generos,
        sinopsis: titleItem.sinopsis,
        finishType: finishType,
      });

      for (const sizeId of sizesToUse) {
        const sizeObj = ADAPTABLE_SIZES.find((s) => s.id === sizeId);
        const widthCm =
          sizeObj?.widthCm ?? (parseInt(sizeId.split('x')[0], 10) || 50);
        const heightCm =
          sizeObj?.heightCm ?? (parseInt(sizeId.split('x')[1], 10) || 70);
        const sizeLabel = sizeObj?.label ?? `${widthCm} × ${heightCm} cm`;

        const basePrice =
          pricingConfig.basePrices?.[sizeId] ?? sizeObj?.defaultPrice ?? 24900;

        for (const finishId of finishesToUse) {
          const isResina = finishId.includes('resina');
          const isHolo = finishId.includes('holo');
          const isBrillante = finishId.includes('brillante');
          const finishName = isResina
            ? 'Resina Epoxi Cristal'
            : isHolo
            ? 'Holográfico Tornasolado'
            : isBrillante
            ? 'Vinilo Brillante'
            : 'Vinilo Mate';

          const finishSurcharge =
            pricingConfig.finishSurcharges?.[finishId] ??
            (isResina ? 4500 : isHolo ? 2500 : 0);

          const finalPrice = Math.round(basePrice + finishSurcharge);
          const freeShippingLimit = pricingConfig.freeShippingThreshold ?? 30000;
          const shippingCost =
            finalPrice >= freeShippingLimit
              ? 'Ofrecés envío gratis'
              : 'A cargo del comprador';

          const skuCleanTitle =
            titleItem.titulo
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9]/g, '')
              .toUpperCase()
              .slice(0, 6) || 'ART';
          const skuFinish = isResina
            ? 'RESI'
            : isHolo
            ? 'HOLO'
            : isBrillante
            ? 'BRIL'
            : 'MATE';
          const sku = `AURA-${skuCleanTitle}-${widthCm}X${heightCm}-${skuFinish}`;

          const photos = titleItem.posterUrl || titleItem.poster_path || '';
          const stock = pricingConfig.defaultStock ?? 99;
          const excelRowNum = rowIndex + 1;

          // Col A: Código de catálogo ML
          ws[`A${excelRowNum}`] = { t: 's', v: '' };

          // Col B: Título SEO (<60 chars)
          ws[`B${excelRowNum}`] = { t: 's', v: seoTitle };

          // Col C: Cantidad de caracteres (Fórmula)
          ws[`C${excelRowNum}`] = {
            t: 'n',
            f: `LEN(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1))))`,
            v: seoTitle.length,
          };

          // Col D: Condición
          ws[`D${excelRowNum}`] = { t: 's', v: 'Nuevo' };

          // Col E: Código universal de producto
          ws[`E${excelRowNum}`] = {
            t: 's',
            v: 'El producto no tiene código registrado',
          };

          // Col F: Varía por: Nombre comercial del color (Acabado)
          ws[`F${excelRowNum}`] = { t: 's', v: finishName };

          // Col G: Varía por: Color del armazón (Medida)
          ws[`G${excelRowNum}`] = { t: 's', v: sizeLabel };

          // Col H: Fotos
          ws[`H${excelRowNum}`] = { t: 's', v: photos };

          // Col I: SKU
          ws[`I${excelRowNum}`] = { t: 's', v: sku };

          // Col J: Stock
          ws[`J${excelRowNum}`] = { t: 'n', v: stock };

          // Col K: Precio [$]
          ws[`K${excelRowNum}`] = { t: 'n', v: finalPrice };

          // Col L: Formato de venta
          ws[`L${excelRowNum}`] = { t: 's', v: 'Unidad' };

          // Col M: Unidades por pack
          ws[`M${excelRowNum}`] = { t: 'n', v: 1 };

          // Col N: Descripción persuasiva
          ws[`N${excelRowNum}`] = { t: 's', v: description };

          // Col O: Cargo por vender (Clásica)
          ws[`O${excelRowNum}`] = {
            t: 's',
            f: `IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(1)))="Agregar cuotas",IF(("14.3%")="","-","14.3%"),IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(1)))="No agregar cuotas",IF(("14.3%")="","-","14.3%"),"-"))`,
            v: '14.3%',
          };

          // Col P: Cuotas
          ws[`P${excelRowNum}`] = { t: 's', v: 'No agregar cuotas' };

          // Col Q: Costo por ofrecer cuotas
          ws[`Q${excelRowNum}`] = {
            t: 's',
            f: `IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1)))="Agregar cuotas",IF(("12.3%")="","Sin costo","12.3%"),IF(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1)))="No agregar cuotas",IF(("")="","Sin costo",""),"-"))`,
            v: 'Sin costo',
          };

          // Col R: Forma de envío
          ws[`R${excelRowNum}`] = { t: 's', v: 'Mercado Envíos' };

          // Col S: Costo de envío
          ws[`S${excelRowNum}`] = { t: 's', v: shippingCost };

          // Col T: Retiro en persona
          ws[`T${excelRowNum}`] = { t: 's', v: 'Acepto' };

          // Col U: Tipo de garantía
          ws[`U${excelRowNum}`] = { t: 's', v: 'Garantía del vendedor' };

          // Col V: Tiempo de garantía
          ws[`V${excelRowNum}`] = { t: 'n', v: 30 };

          // Col W: Unidad de Tiempo de garantía
          ws[`W${excelRowNum}`] = { t: 's', v: 'días' };

          // Col X: Tiempo de disponibilidad del producto
          ws[`X${excelRowNum}`] = { t: 'n', v: 2 };

          // Col Y: Factura A
          ws[`Y${excelRowNum}`] = { t: 's', v: 'No ofrezco' };

          // Col Z: Marca
          ws[`Z${excelRowNum}`] = { t: 's', v: 'Aura Studio' };

          // Col AA: Modelo
          ws[`AA${excelRowNum}`] = {
            t: 's',
            v: isResina
              ? 'Cuadro Resina Epoxi Premium'
              : 'Cuadro Vinilico Premium HD',
          };

          // Col AB: Temática del cuadro
          ws[`AB${excelRowNum}`] = { t: 's', v: toTitleCase(category) || 'Cine' };

          // Col AC: Altura
          ws[`AC${excelRowNum}`] = { t: 'n', v: heightCm };

          // Col AD: Unidad de Altura
          ws[`AD${excelRowNum}`] = { t: 's', v: 'cm' };

          // Col AE: Ancho
          ws[`AE${excelRowNum}`] = { t: 'n', v: widthCm };

          // Col AF: Unidad de Ancho
          ws[`AF${excelRowNum}`] = { t: 's', v: 'cm' };

          // Col AG: Tipo de panel
          ws[`AG${excelRowNum}`] = { t: 's', v: 'Panel único' };

          // Col AH: Marco
          ws[`AH${excelRowNum}`] = { t: 's', v: 'No' };

          // Col AI: Espesor del marco
          ws[`AI${excelRowNum}`] = { t: 'n', v: 2 };

          // Col AJ: Unidad de Espesor del marco
          ws[`AJ${excelRowNum}`] = { t: 's', v: 'cm' };

          // Col AK: Material del marco
          ws[`AK${excelRowNum}`] = { t: 's', v: 'Madera' };

          // Col AL: Vidrio
          ws[`AL${excelRowNum}`] = {
            t: 's',
            v: isResina ? 'Con vidrio líquido (Resina Epoxi)' : 'No',
          };

          // Col AM: Frases
          ws[`AM${excelRowNum}`] = { t: 's', v: 'No' };

          // Col AN: Resumen de errores (Fórmula ML)
          ws[`AN${excelRowNum}`] = {
            t: 's',
            f: `IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("A"&ROW()))="",INDIRECT("A"&ROW())="Escribí o elegí un valor"))," - Código de catálogo ML","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("D"&ROW()))="",INDIRECT("D"&ROW())="Seleccionar"))," - Condición","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("D"&ROW()))="",INDIRECT("D"&ROW())="Seleccionar"))," - Condición","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("E"&ROW()))="",INDIRECT("E"&ROW())="Escribí o elegí un valor"))," - Código universal de producto","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("E"&ROW()))="",INDIRECT("E"&ROW())="Escribí o elegí un valor"))," - Código universal de producto","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("F"&ROW()))="",INDIRECT("F"&ROW())="Escribí o elegí un valor"))," - Varía por: Nombre comercial del color","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("H"&ROW()))="",INDIRECT("H"&ROW())="Escribí o elegí un valor"))," - Fotos","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("J"&ROW()))="",INDIRECT("J"&ROW())=""))," - Stock","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("J"&ROW()))="",INDIRECT("J"&ROW())=""))," - Stock","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("K"&ROW()))="",INDIRECT("K"&ROW())=""))," - Precio [$]","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("K"&ROW()))="",INDIRECT("K"&ROW())=""))," - Precio [$]","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("P"&ROW()))="",INDIRECT("P"&ROW())="Seleccionar"))," - Cuotas","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("P"&ROW()))="",INDIRECT("P"&ROW())="Seleccionar"))," - Cuotas","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("R"&ROW()))="",INDIRECT("R"&ROW())="Seleccionar"))," - Forma de envío","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("R"&ROW()))="",INDIRECT("R"&ROW())="Seleccionar"))," - Forma de envío","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("S"&ROW()))="",INDIRECT("S"&ROW())="Seleccionar"))," - Costo de envío","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("S"&ROW()))="",INDIRECT("S"&ROW())="Seleccionar"))," - Costo de envío","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("T"&ROW()))="",INDIRECT("T"&ROW())="Seleccionar"))," - Retiro en persona","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("T"&ROW()))="",INDIRECT("T"&ROW())="Seleccionar"))," - Retiro en persona","")&IF(AND(INDIRECT("AO"&ROW())=TRUE,OR(TRIM(INDIRECT("Y"&ROW()))="",INDIRECT("Y"&ROW())="Seleccionar"))," - Factura A","")&IF(AND(INDIRECT("AO"&ROW())=FALSE,OR(TRIM(INDIRECT("Z"&ROW()))="",INDIRECT("Z"&ROW())="Escribí o elegí un valor"))," - Marca","")`,
            v: '',
          };

          // Col AO: BUYBOX_FORMULA
          ws[`AO${excelRowNum}`] = {
            t: 's',
            f: `IF(OR(TRIM(INDIRECT("B"&ROW()))<>"",TRIM(INDIRECT("A"&ROW()))<>""),AND(TRIM(INDIRECT("A"&ROW()))<>"",TRIM(INDIRECT("D"&ROW()))="nuevo"),"")`,
            v: '',
          };

          rowIndex++;
          totalGeneratedRows++;
        }
      }
    }

    // Clean remaining template rows if any
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      const lastFilledRowIndex = rowIndex - 1;
      for (let r = lastFilledRowIndex + 1; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          delete ws[XLSX.utils.encode_cell({ r, c })];
        }
      }
      range.e.r = Math.max(range.e.r, lastFilledRowIndex);
      ws['!ref'] = XLSX.utils.encode_range(range);
    }

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      cellStyles: true,
    }) as Buffer;

    const formattedDate = new Date().toISOString().slice(0, 10);
    const filename =
      options.filename ||
      `Publicacion_MercadoLibre_AuraStudio_${formattedDate}.xlsx`;
    const normalizedDir = outputDir.replace(/[\\/]+$/, '');
    const targetPath = `${normalizedDir}/${filename}`;

    // 1. Try Node.js fs
    try {
      const fs = await import('fs');
      const pathModule = await import('path');
      const resolvedDir = pathModule.dirname(targetPath);
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, buffer);
      return {
        success: true,
        filePath: targetPath,
        filename,
        totalRows: totalGeneratedRows,
      };
    } catch {
      // In renderer/browser
    }

    // 2. Try window.electronAPI.saveBuffer
    if (typeof window !== 'undefined' && window.electronAPI?.saveBuffer) {
      const res = await window.electronAPI.saveBuffer({
        buffer: new Uint8Array(buffer),
        targetPath,
      });
      if (res.success) {
        return {
          success: true,
          filePath: res.path || targetPath,
          filename,
          totalRows: totalGeneratedRows,
        };
      }
    }

    // 3. Fallback: Browser download
    if (typeof window !== 'undefined') {
      XLSX.writeFile(wb, filename);
    }

    return {
      success: true,
      filePath: targetPath,
      filename,
      totalRows: totalGeneratedRows,
    };
  } catch (error: any) {
    console.error('Error in exportMassivePublicationToMlExcel:', error);
    return {
      success: false,
      totalRows: 0,
      error: error.message || 'Error al exportar planilla masiva de MercadoLibre',
    };
  }
}

