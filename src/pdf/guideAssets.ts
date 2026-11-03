import { getScreenshot } from '../shared/screenshotDb';
import type { Guide } from '../shared/types';
import type { ImageSize, ScreenshotData } from './document';

export interface GuideAssets {
  screenshots: Map<string, ScreenshotData | null>;
  imageSizes: Map<string, ImageSize>;
}

const FALLBACK_IMAGE_SIZE: ImageSize = { width: 1600, height: 900 };
const IMAGE_DECODE_TIMEOUT_MS = 4000;

const cache = new Map<string, ScreenshotData | null>();
const sizeCache = new Map<string, ImageSize>();
const CACHE_LIMIT = 80;

function rememberScreenshot(id: string, value: ScreenshotData | null): void {
  cache.delete(id);
  cache.set(id, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

function measureImage(dataUrl: string): Promise<ImageSize> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(FALLBACK_IMAGE_SIZE);
      return;
    }
    const image = new Image();
    let settled = false;
    const finish = (size: ImageSize) => {
      if (settled) return;
      settled = true;
      resolve(size);
    };
    const timer = setTimeout(() => finish(FALLBACK_IMAGE_SIZE), IMAGE_DECODE_TIMEOUT_MS);
    image.onload = () => {
      clearTimeout(timer);
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      finish(width > 0 && height > 0 ? { width, height } : FALLBACK_IMAGE_SIZE);
    };
    image.onerror = () => {
      clearTimeout(timer);
      finish(FALLBACK_IMAGE_SIZE);
    };
    image.src = dataUrl;
  });
}

async function loadOne(id: string): Promise<{
  screenshot: ScreenshotData | null;
  size: ImageSize;
}> {
  let screenshot = cache.has(id) ? (cache.get(id) ?? null) : undefined;
  if (screenshot === undefined) {
    try {
      const record = await getScreenshot(id);
      screenshot = record?.dataUrl ? { dataUrl: record.dataUrl } : null;
    } catch {
      screenshot = null;
    }
    rememberScreenshot(id, screenshot);
  }

  if (!screenshot) return { screenshot: null, size: FALLBACK_IMAGE_SIZE };

  const cachedSize = sizeCache.get(id);
  if (cachedSize) return { screenshot, size: cachedSize };

  const size = await measureImage(screenshot.dataUrl);
  sizeCache.set(id, size);
  return { screenshot, size };
}

export async function loadGuideAssets(guide: Guide): Promise<GuideAssets> {
  const ids = Array.from(
    new Set(
      guide.steps
        .map((step) => step.screenshotId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const screenshots = new Map<string, ScreenshotData | null>();
  const imageSizes = new Map<string, ImageSize>();

  await Promise.all(
    ids.map(async (id) => {
      const { screenshot, size } = await loadOne(id);
      screenshots.set(id, screenshot);
      if (screenshot) imageSizes.set(id, size);
    }),
  );

  return { screenshots, imageSizes };
}
