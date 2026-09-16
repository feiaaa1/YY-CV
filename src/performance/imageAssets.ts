export type ImageLoadProgress = {
  loaded: number;
  total: number;
};

const loadedImages = new Map<string, HTMLImageElement>();
const imageRequests = new Map<string, Promise<HTMLImageElement>>();

export function getLoadedImageAsset(source: string): HTMLImageElement | undefined {
  return loadedImages.get(source);
}

export function loadImageAsset(
  source: string,
  priority: 'high' | 'low' | 'auto' = 'auto',
): Promise<HTMLImageElement> {
  const loaded = loadedImages.get(source);
  if (loaded) return Promise.resolve(loaded);

  const pending = imageRequests.get(source);
  if (pending) return pending;

  if (typeof Image === 'undefined') {
    return Promise.reject(new Error(`Image loading is unavailable for ${source}`));
  }

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = priority;
    image.onload = async () => {
      try {
        await image.decode();
      } catch {
        // A completed image can still be rendered when decode() is unsupported or interrupted.
      }
      loadedImages.set(source, image);
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
    image.src = source;
  }).catch((error: unknown) => {
    imageRequests.delete(source);
    throw error;
  });

  imageRequests.set(source, request);
  return request;
}

export async function preloadImageAssets(
  sources: readonly string[],
  onProgress?: (progress: ImageLoadProgress) => void,
  priority: 'high' | 'low' | 'auto' = 'auto',
): Promise<string[]> {
  const uniqueSources = [...new Set(sources)];
  let loaded = 0;
  onProgress?.({ loaded, total: uniqueSources.length });

  const results = await Promise.allSettled(uniqueSources.map(async (source) => {
    await loadImageAsset(source, priority);
    loaded += 1;
    onProgress?.({ loaded, total: uniqueSources.length });
    return source;
  }));

  return results.flatMap((result, index) => (
    result.status === 'rejected' ? [uniqueSources[index]!] : []
  ));
}
