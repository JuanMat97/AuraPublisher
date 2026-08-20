---
name: cuadros-library-pipeline
description: Comprehensive pipeline guide for Hermes Agent and catalog ingestion, local library structure (E:\AuraStudio\Cuadros), 9 core categories, metadata schemas, and quality tiers.
---

# Cuadros Library Pipeline & Ingestion Guide — Hermes Agent

Esta guía documenta la arquitectura de ingesta, escaneo, clasificación y estandarización del catálogo de obras de arte y pósters para AuraStudio y AuraPublisher.

---

## 1. Ruta Raíz y Jerarquía de Catálogo

El repositorio local de alta resolución reside en:
```text
E:\AuraStudio\Cuadros
```

### Las 9 Categorías Oficiales

| ID de Categoría | Nombre Comercial | Temática y Enfoque |
| :--- | :--- | :--- |
| `peliculas` | Películas | Cine de culto, clásicos, directores icónicos, blockbusters |
| `series` | Series | Series de TV legendarias, streaming hits, animación occidental |
| `anime` | Anime | Manga, animación japonesa, Studio Ghibli, Shonen, Seinen |
| `videojuegos` | Videojuegos | Setup gamer, retro gaming, franquicias AAA, Cyberpunk |
| `musica` | Música | Bandas de rock, leyendas, portadas de discos vinilo, jazz |
| `arte` | Arte | Obras maestras de museo, impresionismo, renacimiento, abstracto |
| `deportes` | Deportes | Ídolos deportivos, fútbol argentino/mundial, F1, básquet |
| `paisajes` | Paisajes | Naturaleza, auroras boreales, bosques, atardeceres, mar |
| `ciudades` | Ciudades | Arquitectura urbana, skylines nocturnos, Tokyo, New York |

---

## 2. Estructura de Directorio por Título

Cada título dentro de una categoría debe respetar de forma estricta la siguiente estructura:

```text
E:\AuraStudio\Cuadros\
└── <CATEGORIA>\
    └── <TITULO> [<FUENTE-ID>]\
        ├── metadata.json
        ├── poster\
        │   ├── <filename_1>.jpg
        │   ├── <filename_2>.webp
        │   └── ...
        └── imagenes\
            ├── <backdrop_1>.jpg
            ├── <scene_2>.jpg
            └── ...
```

### Reglas de Nombres de Carpeta
- `<TITULO>`: Nombre principal de la obra o franquicia limpio de caracteres reservados del sistema de archivos.
- `[<FUENTE-ID>]`: Identificador unívoco opcional de la fuente de datos externa (ej. ID de TMDB, RAWG, Discogs, IGDB o hash de catálogo).
  - *Ejemplos:*
    - `E:\AuraStudio\Cuadros\peliculas\Pulp Fiction [680]\`
    - `E:\AuraStudio\Cuadros\videojuegos\Cyberpunk 2077 [109]\`
    - `E:\AuraStudio\Cuadros\anime\Attack on Titan [1429]\`

---

## 3. Esquema Estricto de `metadata.json`

Cada carpeta de obra contiene un archivo `metadata.json` con la información canónica de la pieza:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "id": 680,
  "titulo": "Pulp Fiction",
  "titulo_original": "Pulp Fiction",
  "anio": 1994,
  "generos": ["Crimen", "Drama", "Culto"],
  "sinopsis": "Las vidas de dos mafiosos, un boxeador, la esposa de un gángster y dos bandidos se entrelazan en cuatro historias de violencia y redención.",
  "posters": [
    {
      "file": "pulp_fiction_main_poster.jpg",
      "file_path": "E:\\AuraStudio\\Cuadros\\peliculas\\Pulp Fiction [680]\\poster\\pulp_fiction_main_poster.jpg",
      "url_original": "https://image.tmdb.org/t/p/original/...",
      "width": 2000,
      "height": 3000,
      "aspect_ratio": 0.66667,
      "quality_tier": "excelente"
    }
  ],
  "imagenes": [
    {
      "file": "mia_wallace_scene.jpg",
      "width": 3840,
      "height": 2160,
      "aspect_ratio": 1.77778
    }
  ]
}
```

### Tabla de Campos de `metadata.json`

| Campo | Tipo | Requerido | Descripción |
| :--- | :---: | :---: | :--- |
| `id` | `string \| number` | No | ID único en base de datos o API proveedora |
| `titulo` | `string` | **Sí** | Título comercial en español / limpio |
| `titulo_original` | `string` | No | Título en idioma original |
| `anio` | `string \| number` | No | Año de estreno o creación |
| `generos` | `string[]` | **Sí** | Array de géneros o temáticas principales |
| `sinopsis` | `string` | No | Resumen o argumento para generación de copy persuasivo |
| `posters` | `LibraryPoster[]` | **Sí** | Array de variantes verticales / pósters disponibles |
| `imagenes` | `LibraryImage[]` | No | Backdrops, escenas horizontales o detalles |

---

## 4. Clasificación de Calidad y Resolución (`quality_tier`)

Para garantizar una impresión Fine Art a 300 DPI sin pixelación ni artefactos en tamaños grandes (hasta $100 \times 70\text{ cm}$):

```text
Altura de Imagen (Pixels Verticales):

[ >= 2800 px ] ──────► TIER: "excelente"
                       Apto para todos los formatos (incluyendo 70x100 cm y Living XL).
                       Densidad fotográfica Fine Art 300 DPI completa.

[ 1800 a 2799 px ] ──► TIER: "buena"
                       Apto para cuadros estándar hasta 50x70 cm y 60x40 cm.

[ 1200 a 1799 px ] ──► TIER: "utilizable"
                       Restringido a formatos pequeños (25x25 cm, 40x60 cm).

[ < 1200 px ] ───────► TIER: "descartar"
                       Descartado automáticamente por el pipeline de publicación.
```

---

## 5. Pipeline de Escaneo e Ingesta del Agente Hermes

### Flujo de Ejecución en AuraPublisher

```mermaid
flowchart TD
    A[Inicio Escaneo Hermes] --> B{¿Entorno Electron Activo?}
    B -- Sí --> C[Llamada IPC catalog:scan a Node fs]
    B -- No --> D[Carga de Caché Embebido embeddedCatalogData.json]
    C --> E[Lectura E:\AuraStudio\Cuadros por Categoría]
    E --> F[Parseo de metadata.json y Validación Sharp]
    F --> G[Cálculo de Quality Tier y Aspect Ratio]
    G --> H[Estandarización de LibraryTitle[]]
    D --> H
    H --> I[Disponibilización para Publicación Masiva y Mockup Studio]
```

### Métodos de Normalización
1. **Detección Automática de Proporción:**
   - $\text{Aspect Ratio} < 0.95 \rightarrow$ Vertical (3:4, 2:3)
   - $0.95 \le \text{Aspect Ratio} \le 1.05 \rightarrow$ Cuadrado (1:1)
   - $\text{Aspect Ratio} > 1.05 \rightarrow$ Horizontal (16:9, Panorámico)
2. **Sanitización de Título:**
   - Eliminación de sufijos `[ID]`, extensiones de archivo, tags de resolución (`1080p`, `4K`, `HD`) y guiones bajos.
3. **Respaldo Offline:**
   - Si el disco `E:\` no está montado, el sistema conmuta sin fisuras al archivo estático embebido de más de 430 títulos curados.
