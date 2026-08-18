export interface SeoAnalysisResult {
  detectedTopic: string;
  category: 'gamer' | 'cine_series' | 'musica' | 'deportes' | 'anime' | 'arte_general';
  titles: Array<{ id: string; formula: string; title: string; length: number }>;
  emotionalPitch: string;
  fullDescription: string;
  suggestedKeywords: string[];
}

interface TopicDatabaseEntry {
  patterns: RegExp[];
  cleanTopic: string;
  category: 'gamer' | 'cine_series' | 'musica' | 'deportes' | 'anime' | 'arte_general';
  loreHook: string;
  keywords: string[];
}

const TOPIC_DATABASE: TopicDatabaseEntry[] = [
  // GTA / Grand Theft Auto
  {
    patterns: [/gta\s*6|gta\s*vi|vice\s*city|lucia|jason/i],
    cleanTopic: 'GTA 6',
    category: 'gamer',
    loreHook: 'El hype del videojuego más esperado de la historia en tu pared. Toda la vibra neón, atardeceres de Vice City y el estilo inconfundible de Rockstar Games.',
    keywords: ['GTA 6', 'GTA VI', 'Vice City', 'Lucia GTA', 'Gamer 4K', 'Rockstar Games', 'Setup Neón'],
  },
  {
    patterns: [/gta\s*5|gta\s*v|los\s*santos|trevor|michael|franklin/i],
    cleanTopic: 'GTA V',
    category: 'gamer',
    loreHook: 'El clásico indiscutido que marcó a toda una generación. El trío legendario dominando la bahía de Los Santos en calidad de galería.',
    keywords: ['GTA 5', 'GTA V', 'Los Santos', 'Trevor Philips', 'Gamer Room', 'Cuadro Videojuegos'],
  },
  {
    patterns: [/gta\s*4|gta\s*iv|niko\s*bellic|liberty\s*city/i],
    cleanTopic: 'GTA IV',
    category: 'gamer',
    loreHook: 'Reviví la atmósfera cruda, oscura e inolvidable de Liberty City junto a Niko Bellic. Una obra de culto para los verdaderos amantes del gaming.',
    keywords: ['GTA 4', 'Niko Bellic', 'Liberty City', 'Rockstar Games', 'Setup Gamer'],
  },

  // Cyberpunk
  {
    patterns: [/cyberpunk|night\s*city|johnny\s*silverhand|edgerunners/i],
    cleanTopic: 'Cyberpunk 2077',
    category: 'gamer',
    loreHook: 'Las luces de neón, el ciberespacio y la gloria de Night City en tu setup. Una pieza futurista con profundidad extrema.',
    keywords: ['Cyberpunk 2077', 'Night City', 'Johnny Silverhand', 'Edgerunners', 'Setup Gamer Neón', 'Sci-Fi'],
  },

  // Marvel / Comics
  {
    patterns: [/spider\s*man|spiderman|miles\s*morales|peter\s*parker/i],
    cleanTopic: 'Spider-Man',
    category: 'cine_series',
    loreHook: 'El héroe favorito de todos balanceándose sobre tu pared. Un diseño con energía explosiva y dinamismo para transformar cualquier habitación.',
    keywords: ['Spider-Man', 'Marvel Comics', 'Miles Morales', 'Avengers', 'Coleccionista'],
  },
  {
    patterns: [/iron\s*man|ironman|tony\s*stark/i],
    cleanTopic: 'Iron Man',
    category: 'cine_series',
    loreHook: 'El poder, la tecnología y el legado de Tony Stark. Con el brillo de la resina epoxi, la armadura metálica adquiere un destello deslumbrante.',
    keywords: ['Iron Man', 'Tony Stark', 'Marvel Avengers', 'Vengadores', 'Cuadro Metálico'],
  },

  // Dragon Ball / Anime
  {
    patterns: [/dragon\s*ball|goku|vegeta|saiyajin|dbz/i],
    cleanTopic: 'Dragon Ball Z',
    category: 'anime',
    loreHook: 'Pura nostalgia, ki desbordante y los momentos más épicos de tu infancia. El impacto visual definitivo para coronar tu espacio.',
    keywords: ['Dragon Ball Z', 'Goku Ultra Instinto', 'Vegeta', 'Anime 4K', 'Manga', 'Otaku Room'],
  },

  // Deportes / Fútbol
  {
    patterns: [/messi|inter\s*miami|seleccion|scaloni|campeon/i],
    cleanTopic: 'Lionel Messi',
    category: 'deportes',
    loreHook: 'La gloria máxima y la emoción del mejor de todos los tiempos. Inmortalizá en tu pared el momento que nos llenó de orgullo.',
    keywords: ['Lionel Messi', 'Messi Campeón', 'Selección Argentina', 'Fútbol', 'Cuadro Deportivo'],
  },
];

/**
 * Ensures strict MercadoLibre title rules:
 * - Max 60 characters
 * - Includes AuraStudio brand
 * - Mentions Set/Diptych/Triptych when panels > 1
 * - Includes size
 */
function buildMercadoLibreTitle(prefix: string, topic: string, sizeStr: string, suffix: string = 'AuraStudio'): string {
  // Try full title: "Cuadro Vinilico Premium GTA 6 100x70 AuraStudio"
  let title = `${prefix} ${topic} ${sizeStr} ${suffix}`.replace(/\s+/g, ' ').trim();

  if (title.length <= 60) return title;

  // Shorten prefix if needed: e.g. "Cuadro Vinilo GTA 6 100x70 AuraStudio"
  const shortPrefix = prefix
    .replace('Vinilico Premium', 'Vinilo')
    .replace('Resina Epoxi', 'Resina')
    .replace('Decorativo Premium', 'Deco');

  title = `${shortPrefix} ${topic} ${sizeStr} ${suffix}`.replace(/\s+/g, ' ').trim();
  if (title.length <= 60) return title;

  // Truncate cleanly while preserving suffix
  const maxTopicLen = 60 - shortPrefix.length - sizeStr.length - suffix.length - 4;
  const truncatedTopic = topic.length > maxTopicLen ? topic.substring(0, maxTopicLen).trim() : topic;

  return `${shortPrefix} ${truncatedTopic} ${sizeStr} ${suffix}`.substring(0, 60).trim();
}

export function analyzeArtworkAndGenerateSeo(options: {
  filename: string;
  aiTopic?: string;
  aiCategory?: string;
  aiLoreHook?: string;
  aiKeywords?: string[];
  customTitle?: string;
  sizeName: string;
  widthCm: number;
  heightCm: number;
  finishName: string;
  hasResina: boolean;
  panelsCount: number;
}): SeoAnalysisResult {
  const {
    filename,
    aiTopic,
    aiCategory,
    aiLoreHook,
    aiKeywords,
    customTitle,
    widthCm,
    heightCm,
    finishName,
    hasResina,
    panelsCount,
  } = options;

  const rawText = `${customTitle || ''} ${filename}`.toLowerCase();
  const found = TOPIC_DATABASE.find((item) => item.patterns.some((regex) => regex.test(rawText)));

  const cleanFallbackName = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\d+x\d+\b/gi, '')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const detectedTopic = aiTopic || found?.cleanTopic || cleanFallbackName || 'Diseño Exclusivo';
  const category = (aiCategory as any) || found?.category || 'arte_general';
  const loreHook = aiLoreHook || found?.loreHook || 'Una pieza decorativa de alto impacto visual diseñada para transformar tus espacios con elegancia, profundidad y calidad de galería de arte.';

  const isSet = panelsCount > 1;
  const formatText = panelsCount === 3 ? 'Tríptico' : panelsCount === 2 ? 'Díptico' : 'Individual';
  const sizeShort = `${widthCm}x${heightCm}`;

  // Formula 1: Premium Direct Search
  // E.g.: "Cuadro Vinilico Premium GTA 6 100x70 AuraStudio" or "Cuadro Set Diptico GTA 6 100x70 AuraStudio"
  const prefix1 = isSet ? `Cuadro Set ${formatText}` : 'Cuadro Vinilico Premium';
  const title1 = buildMercadoLibreTitle(prefix1, detectedTopic, sizeShort, 'AuraStudio');

  // Formula 2: Resina Epoxi / Vidrio Líquido Focus
  // E.g.: "Cuadro Resina Epoxi GTA 6 100x70 AuraStudio"
  const prefix2 = hasResina ? (isSet ? `Set ${formatText} Resina Epoxi` : 'Cuadro Resina Epoxi') : `Cuadro Vinilo ${finishName}`;
  const title2 = buildMercadoLibreTitle(prefix2, detectedTopic, sizeShort, 'AuraStudio');

  // Formula 3: Colección / Gamer / Deco
  // E.g.: "Cuadro Coleccion GTA 6 100x70 AuraStudio"
  const prefix3 = isSet ? `Coleccion ${formatText} Premium` : 'Cuadro Decorativo Gamer';
  const title3 = buildMercadoLibreTitle(prefix3, detectedTopic, sizeShort, 'AuraStudio');

  const titles = [
    {
      id: 'formula_ml_direct',
      formula: isSet ? 'Set / Colección + Tema + Medida + Marca' : 'Producto + Tema Reconocible + Medida + Marca',
      title: title1,
      length: title1.length,
    },
    {
      id: 'formula_niche_finish',
      formula: hasResina ? 'Acabado Espejo Resina Epoxi + Medida' : 'Acabado Vinilo + Medida',
      title: title2,
      length: title2.length,
    },
    {
      id: 'formula_decorativo',
      formula: isSet ? 'Colección Paneles Decorativos' : 'Decoración Gamer / Coleccionista',
      title: title3,
      length: title3.length,
    },
  ];

  const fullDescription = `
✨ ${isSet ? `SET ${formatText.toUpperCase()}` : 'CUADRO'} PREMIUM ${detectedTopic.toUpperCase()} — AURASTUDIO ✨

${loreHook}

Transformá tu setup gamer, sala de estar o habitación con una obra fabricada con los más altos estándares de calidad de galería de arte.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 ESPECIFICACIONES TÉCNICAS:
• Formato: ${panelsCount > 1 ? `Set ${formatText} de ${panelsCount} paneles` : 'Panel único'}
• Medidas Totales: ${widthCm} cm de ancho × ${heightCm} cm de alto.
• Bastidor: Borde Envolvente de 1 cm (la imagen continúa por los 4 cantos laterales con efecto inmersivo).
• Acabado del Vinilo: ${finishName} de ultra alta resolución (impresión a 1440 DPI).
${hasResina ? '• Capa de Resina Epoxi: Vidrio líquido de 2mm con brillo espejado 3D y máxima saturación de color.\n' : ''}• Protección UV: Filtro solar 100% que previene decoloración y amarilleo con los años.
• Instalación Rápida: Incluye soporte trasero reforzado y kit de fijación (listo para colgar en 5 minutos).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 ¿POR QUÉ ELEGIR AURASTUDIO?
${hasResina ? '✔ Brillo espejado 3D ultra nítido que potencia los negros y duplica la profundidad visual.\n' : ''}✔ Superficie sellada a prueba de polvo y humedad (se limpia con un paño húmedo en segundos).
✔ Terminación artesanal realizada a mano y testeada individualmente.
✔ Embalaje blindado con cantoneras de protección y film alveolar de triple burbuja para envíos 100% seguros a todo el país.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 ENVÍOS Y GARANTÍA:
• Compra Protegida con Mercado Envíos a todo el país.
• Garantía de fábrica directa de AuraStudio.

¿Tenés alguna consulta? Estamos online para asesorarte.
AURASTUDIO — Diseños que inspiran tu mundo.
`.trim();

  const baseKeywords = aiKeywords || found?.keywords || [
    detectedTopic,
    'Cuadro Decorativo',
    'Arte Moderno',
    'Setup Gamer',
    'Living Room',
    'Calidad Galería',
  ];

  return {
    detectedTopic,
    category,
    titles,
    emotionalPitch: loreHook,
    fullDescription,
    suggestedKeywords: [
      ...baseKeywords,
      sizeShort,
      isSet ? `Set ${formatText}` : 'Panel Único',
      hasResina ? 'Resina Epoxi' : 'Vinilo Premium',
      'AuraStudio',
      'Listo Para Colgar',
    ],
  };
}
