import {
  CAPTURE_JPEG_QUALITY,
  MAX_CAPTURED_IMAGE_BYTES,
  MAX_CAPTURE_HEIGHT,
  MAX_CAPTURE_WIDTH,
} from '../shared/constants';
import { CaptureError } from './errors';

const TO_BLOB_TIMEOUT_MS = 20_000;

export interface CapturedFrame {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  type: string;
}

export interface FrameCaptureOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface FrameCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): CanvasRenderingContext2D | null;
  toBlob(
    callback: (blob: Blob | null) => void,
    type?: string,
    quality?: number,
  ): void;
}

export interface FrameCaptureDeps {
  createCanvas?: () => FrameCanvas;
  readBlobAsDataUrl?: (blob: Blob) => Promise<string>;
}

function defaultCreateCanvas(): FrameCanvas {
  return document.createElement('canvas');
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
        resolve(reader.result);
      } else {
        reject(new CaptureError('frame-failed', 'FileReader returned a non-image data URL.'));
      }
    };
    reader.onerror = () =>
      reject(new CaptureError('frame-failed', 'FileReader failed.', { cause: reader.error }));
    reader.onabort = () =>
      reject(new CaptureError('frame-failed', 'FileReader aborted.', { cause: reader.error }));
    reader.readAsDataURL(blob);
  });
}

export function canvasToBlob(
  canvas: FrameCanvas,
  type = 'image/jpeg',
  quality = CAPTURE_JPEG_QUALITY,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new CaptureError('frame-failed', 'canvas.toBlob timed out.'));
    }, TO_BLOB_TIMEOUT_MS);

    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!blob || blob.size <= 0) {
        reject(new CaptureError('empty-frame', 'Canvas produced an empty blob.'));
        return;
      }
      if (blob.size > MAX_CAPTURED_IMAGE_BYTES) {
        reject(
          new CaptureError(
            'frame-too-large',
            `Captured blob is ${blob.size} bytes, above the ${MAX_CAPTURED_IMAGE_BYTES} limit.`,
          ),
        );
        return;
      }
      resolve(blob);
    };

    try {
      canvas.toBlob(finish, type, quality);
    } catch (error) {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new CaptureError('frame-failed', 'canvas.toBlob threw.', { cause: error }));
      }
    }
  });
}

/**
 * Grabs exactly one frame from the live desktop video. No recording is kept.
 */
export async function captureFrameFromVideo(
  video: HTMLVideoElement,
  options: FrameCaptureOptions = {},
  deps: FrameCaptureDeps = {},
): Promise<CapturedFrame> {
  if (!video || video.readyState < 2) {
    throw new CaptureError(
      'video-not-ready',
      `Video readyState is ${video?.readyState ?? 'missing'}.`,
    );
  }

  const sourceWidth = Math.floor(video.videoWidth);
  const sourceHeight = Math.floor(video.videoHeight);
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new CaptureError(
      'empty-frame',
      `Video dimensions are ${sourceWidth}x${sourceHeight}.`,
    );
  }

  const maxWidth = options.maxWidth ?? MAX_CAPTURE_WIDTH;
  const maxHeight = options.maxHeight ?? MAX_CAPTURE_HEIGHT;
  const quality = options.quality ?? CAPTURE_JPEG_QUALITY;
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = (deps.createCanvas ?? defaultCreateCanvas)();
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new CaptureError('frame-failed', 'Unable to get a 2D canvas context.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(video, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  const dataUrl = await (deps.readBlobAsDataUrl ?? blobToDataUrl)(blob);
  if (!dataUrl.startsWith('data:image/')) {
    throw new CaptureError('frame-failed', 'Captured frame is not an image data URL.');
  }

  return {
    dataUrl,
    width,
    height,
    bytes: blob.size,
    type: blob.type || 'image/jpeg',
  };
}
