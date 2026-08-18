export interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}

const UNSPLASH_ACCESS_KEY = '-TGOV2nyUSsIdY-YOT-7Bf18B3QDjTy1nbymtWO3i9Y';

/**
 * Searches photos on Unsplash API in real-time
 */
export async function searchUnsplashPhotos(
  query: string,
  page = 1,
  perPage = 24
): Promise<{ results: UnsplashPhoto[]; total: number; total_pages: number }> {
  const searchQuery = query.trim() || 'modern living room interior wall';
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    searchQuery
  )}&page=${page}&per_page=${perPage}&orientation=squarish&client_id=${UNSPLASH_ACCESS_KEY}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      results: data.results || [],
      total: data.total || 0,
      total_pages: data.total_pages || 0,
    };
  } catch (error) {
    console.error('Error fetching from Unsplash API:', error);
    throw error;
  }
}
