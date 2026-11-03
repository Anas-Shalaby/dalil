import { ImageOff } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Annotation } from '../types';
import { cn } from '../cn';
import { getScreenshot } from '../screenshotDb';
import { AnnotatedImage } from './AnnotatedImage';

const CACHE_LIMIT = 24;
const cache = new Map<string, string | null>();

async function loadScreenshotData(id: string): Promise<string | null> {
  if (cache.has(id)) {
    const cached = cache.get(id) ?? null;
    cache.delete(id);
    cache.set(id, cached);
    return cached;
  }
  try {
    const record = await getScreenshot(id);
    const dataUrl = record?.dataUrl ?? null;
    cache.set(id, dataUrl);
    if (cache.size > CACHE_LIMIT) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    return dataUrl;
  } catch {
    cache.set(id, null);
    return null;
  }
}

interface ScreenshotViewProps {
  screenshotId: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  annotations?: Annotation[];
  fallback?: ReactNode;
  eager?: boolean;
}

export function ScreenshotView({
  screenshotId,
  alt,
  className,
  imgClassName,
  annotations,
  fallback,
  eager = false,
}: ScreenshotViewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(screenshotId));
  const [visible, setVisible] = useState(eager);
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDataUrl(null);
    setLoading(Boolean(screenshotId));
    setVisible(eager);
  }, [screenshotId, eager]);

  useEffect(() => {
    if (!screenshotId || !holderRef.current || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px' },
    );
    observer.observe(holderRef.current);
    return () => observer.disconnect();
  }, [screenshotId, visible]);

  useEffect(() => {
    if (!screenshotId || !visible) return;
    let cancelled = false;
    setLoading(true);
    loadScreenshotData(screenshotId).then((result) => {
      if (cancelled) return;
      setDataUrl(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [screenshotId, visible]);

  if (!screenshotId) {
    return (
      <div ref={holderRef} className={cn('flex items-center justify-center', className)}>
        {fallback ?? (
          <span className="flex flex-col items-center gap-2 text-xs text-muted">
            <ImageOff aria-hidden="true" className="size-5" />
            لا توجد لقطة
          </span>
        )}
      </div>
    );
  }

  return (
    <div ref={holderRef} className={cn('relative overflow-hidden bg-[#F4F2F9]', className)}>
      {loading ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-l from-[#F4F2F9] via-[#EFECF6] to-[#F4F2F9]"
        />
      ) : null}
      {dataUrl ? (
        annotations && annotations.length > 0 ? (
          <AnnotatedImage
            src={dataUrl}
            annotations={annotations}
            alt={alt}
            className={cn('h-auto w-auto max-w-full', imgClassName)}
          />
        ) : (
          <img
            src={dataUrl}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className={cn('h-full w-full object-contain', imgClassName)}
          />
        )
      ) : !loading ? (
        <div className="flex h-full w-full items-center justify-center p-4">
          {fallback ?? (
            <span className="flex flex-col items-center gap-2 text-xs text-muted">
              <ImageOff aria-hidden="true" className="size-5" />
              تعذّر عرض اللقطة
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export async function loadAllScreenshots(
  screenshotIds: string[],
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    screenshotIds.map(async (id) => [id, await loadScreenshotData(id)] as const),
  );
  return new Map(entries);
}
