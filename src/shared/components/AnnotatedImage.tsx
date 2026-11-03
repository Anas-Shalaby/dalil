import { useEffect, useRef } from 'react';
import { drawAnnotations } from '../annotations';
import { cn } from '../cn';
import type { Annotation } from '../types';

interface AnnotatedImageProps {
  src: string;
  annotations: Annotation[];
  alt: string;
  className?: string;
}

export function AnnotatedImage({ src, annotations, alt, className }: AnnotatedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    const draw = () => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas || !image.complete || image.naturalWidth === 0) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      drawAnnotations(context, annotations, canvas.width, canvas.height);
    };

    image.onload = () => {
      draw();
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        void document.fonts.ready.then(() => draw());
      }
    };
    image.src = src;

    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, [src, annotations]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={cn('block', className)}
    />
  );
}
