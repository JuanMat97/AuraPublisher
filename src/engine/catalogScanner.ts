import embeddedCatalogRaw from './embeddedCatalogData.json';

export interface LibraryPoster {
  file: string;
  file_path?: string;
  url_original?: string;
  width: number;
  height: number;
  aspect_ratio: number;
  quality_tier?: 'excelente' | 'buena' | 'utilizable' | 'descartar';
}

export interface LibraryTitle {
  id: string;
  folderName: string;
  folderPath: string;
  categoria: string;
  titulo: string;
  titulo_original?: string;
  anio?: string;
  generos: string[];
  source_id?: number | string;
  posters: LibraryPoster[];
  imagenesCount: number;
  selectedPosterIndex: number;
  selected: boolean;
}

const embeddedCatalogCache: LibraryTitle[] = embeddedCatalogRaw as LibraryTitle[];

/**
 * Scans the local Cuadros library at basePath (default E:\AuraStudio\Cuadros).
 * If running in Electron, delegates to the native Node fs scanner via IPC.
 * If not running in Electron, or if the directory is unreachable, falls back to
 * the embedded cache containing 430+ titles (313 peliculas, 118 series, etc.).
 */
export async function scanCuadrosLibrary(
  basePath = 'E:\\AuraStudio\\Cuadros'
): Promise<LibraryTitle[]> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.scanLibrary) {
      const electronResults = await window.electronAPI.scanLibrary(basePath);
      if (Array.isArray(electronResults) && electronResults.length > 0) {
        return electronResults as LibraryTitle[];
      }
    }
  } catch (err) {
    console.warn('Electron catalog scan unavailable or failed, using embedded cache:', err);
  }

  // Deep clone embedded cache so mutations (selections, active poster indices) are safe
  return JSON.parse(JSON.stringify(embeddedCatalogCache)) as LibraryTitle[];
}

export const CATALOG_CATEGORIES = [
  { id: 'todas', label: 'Todas' },
  { id: 'peliculas', label: 'Películas' },
  { id: 'series', label: 'Series' },
  { id: 'anime', label: 'Anime' },
  { id: 'videojuegos', label: 'Videojuegos' },
  { id: 'musica', label: 'Música' },
  { id: 'arte', label: 'Arte' },
  { id: 'deportes', label: 'Deportes' },
  { id: 'paisajes', label: 'Paisajes' },
  { id: 'ciudades', label: 'Ciudades' },
] as const;
