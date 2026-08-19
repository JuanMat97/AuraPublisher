export interface GeminiSeoResponse {
  cleanTopic: string;
  category: 'gamer' | 'cine_series' | 'musica' | 'deportes' | 'anime' | 'arte_general';
  loreHook: string;
  keywords: string[];
}

/**
 * Call Google AI Studio Gemini API (gemini-1.5-flash / gemini-2.5-flash)
 * with multimodal vision analysis of the artwork image.
 */
export async function analyzeArtworkWithGemini(
  imageBase64OrUrl: string,
  filename: string,
  apiKey: string
): Promise<GeminiSeoResponse> {
  const prompt = `Analiza esta imagen de arte/diseño decorativo para un cuadro de AuraStudio en MercadoLibre.
Nombre de archivo original: "${filename}".

Devuelve UNICAMENTE un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "cleanTopic": "Nombre limpio, corto y reconocible del personaje, videojuego, serie, artista o tema (Ejemplos: 'GTA 6', 'Spider-Man', 'Cyberpunk 2077', 'Lionel Messi', 'Pink Floyd', 'Atardecer Japonés')",
  "category": "gamer" | "cine_series" | "musica" | "deportes" | "anime" | "arte_general",
  "loreHook": "1 o 2 frases épicas y emocionales que conecten con los fans y coleccionistas explicando por qué este cuadro es una pieza única para su pared/setup.",
  "keywords": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`;

  let requestBody: any;

  if (imageBase64OrUrl.startsWith('data:image')) {
    const base64Data = imageBase64OrUrl.split(',')[1];
    const mimeType = imageBase64OrUrl.substring(imageBase64OrUrl.indexOf(':') + 1, imageBase64OrUrl.indexOf(';'));

    requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
      },
    };
  } else {
    requestBody = {
      contents: [
        {
          parts: [{ text: `${prompt}\n(Nota: Si no puedes ver la imagen física, analiza el nombre de archivo "${filename}")` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
      },
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google AI Studio Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleanJson = rawJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

  return JSON.parse(cleanJson);
}

/**
 * Uses Google Gemini AI to enhance and rewrite product descriptions for MercadoLibre
 */
export async function enhanceDescriptionWithGemini(params: {
  theme: string;
  designName: string;
  type: string;
  currentDescription: string;
  apiKey: string;
}): Promise<string> {
  const prompt = `Actúa como redactor profesional de ecommerce de arte y cuadros decorativos para MercadoLibre.
Diseño: "${params.designName}" (Temática: "${params.theme}")
Tipo de producto: "${params.type}"

Optimiza y potencia la siguiente descripción de publicación para MercadoLibre.
Debe ser persuasiva, estructurada con viñetas claras y emojis elegantes, destacando la calidad de impresión Fine Art HD 1440 DPI, bastidor de madera maciza de 1 pulgada listo para colgar con cantos continuos, protección UV de por vida y los acabados (Vinilo Mate, Brillante, Holográfico y Resina Epoxi Cristal 3D).
Devuelve ÚNICAMENTE el texto final de la descripción en texto plano limpio (sin introducciones, sin markdown envolvente de bloque de código).

Texto base actual:
${params.currentDescription}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1200,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${params.apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google AI Studio Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return rawText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
}

