import { describe, expect, it, vi } from 'vitest';
import {
  blobToDataUrl,
  canvasToBlob,
  captureFrameFromVideo,
  type FrameCanvas,
} from './frameCapture';
import { MAX_CAPTURED_IMAGE_BYTES } from '../shared/constants';

interface FakeCanvas extends FrameCanvas {
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  smoothing: boolean;
}

function createFakeCanvas(blob: Blob | null = new Blob(['frame'], { type: 'image/jpeg' })): FakeCanvas {
  const context = {
    fillStyle: '',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };
  const canvas: FakeCanvas = {
    width: 0,
    height: 0,
    smoothing: false,
    fillRect: context.fillRect,
    drawImage: context.drawImage,
    getContext: () => context as unknown as CanvasRenderingContext2D,
    toBlob: (callback) => callback(blob),
  };
  return canvas;
}

function fakeVideo(patch: Partial<{ readyState: number; videoWidth: number; videoHeight: number }> = {}) {
  return {
    readyState: 2,
    videoWidth: 1280,
    videoHeight: 720,
    ...patch,
  } as unknown as HTMLVideoElement;
}

const dataUrl = 'data:image/jpeg;base64,ZnJhbWU=';

describe('captureFrameFromVideo', () => {
  it('captures the current frame as JPEG without starting a recording', async () => {
    const canvas = createFakeCanvas();
    const frame = await captureFrameFromVideo(
      fakeVideo(),
      {},
      { createCanvas: () => canvas, readBlobAsDataUrl: async () => dataUrl },
    );

    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
    expect(canvas.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 720);
    expect(frame.dataUrl).toBe(dataUrl);
    expect(frame.type).toBe('image/jpeg');
    expect(frame.width).toBe(1280);
    expect(frame.height).toBe(720);
  });

  it('scales large desktop frames down to the configured bounds', async () => {
    const canvas = createFakeCanvas();
    const frame = await captureFrameFromVideo(
      fakeVideo({ videoWidth: 3840, videoHeight: 2160 }),
      {},
      { createCanvas: () => canvas, readBlobAsDataUrl: async () => dataUrl },
    );

    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(frame.width).toBe(1920);
  });

  it('scales tall screens by height as well', async () => {
    const canvas = createFakeCanvas();
    await captureFrameFromVideo(
      fakeVideo({ videoWidth: 1200, videoHeight: 4000 }),
      {},
      { createCanvas: () => canvas, readBlobAsDataUrl: async () => dataUrl },
    );
    expect(canvas.width).toBe(720);
    expect(canvas.height).toBe(2400);
  });

  it('never upscales small windows', async () => {
    const canvas = createFakeCanvas();
    await captureFrameFromVideo(
      fakeVideo({ videoWidth: 640, videoHeight: 480 }),
      {},
      { createCanvas: () => canvas, readBlobAsDataUrl: async () => dataUrl },
    );
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(480);
  });

  it('rejects a video that is not ready', async () => {
    await expect(
      captureFrameFromVideo(fakeVideo({ readyState: 1 }), {}, { createCanvas: () => createFakeCanvas() }),
    ).rejects.toMatchObject({ code: 'video-not-ready' });
  });

  it('rejects zero-sized frames', async () => {
    await expect(
      captureFrameFromVideo(
        fakeVideo({ videoWidth: 0, videoHeight: 0 }),
        {},
        { createCanvas: () => createFakeCanvas() },
      ),
    ).rejects.toMatchObject({ code: 'empty-frame' });
  });

  it('rejects when no 2D context is available', async () => {
    const canvas = createFakeCanvas();
    canvas.getContext = () => null;
    await expect(
      captureFrameFromVideo(fakeVideo(), {}, { createCanvas: () => canvas }),
    ).rejects.toMatchObject({ code: 'frame-failed' });
  });
});

describe('canvasToBlob', () => {
  it('rejects empty blobs', async () => {
    const canvas = createFakeCanvas(new Blob([]));
    await expect(canvasToBlob(canvas)).rejects.toMatchObject({ code: 'empty-frame' });
  });

  it('rejects blobs above the capture size limit', async () => {
    const huge = { size: MAX_CAPTURED_IMAGE_BYTES + 1, type: 'image/jpeg' } as Blob;
    const canvas = createFakeCanvas(huge);
    await expect(canvasToBlob(canvas)).rejects.toMatchObject({ code: 'frame-too-large' });
  });

  it('rejects when toBlob throws', async () => {
    const canvas = createFakeCanvas();
    canvas.toBlob = () => {
      throw new Error('canvas unavailable');
    };
    await expect(canvasToBlob(canvas)).rejects.toMatchObject({ code: 'frame-failed' });
  });
});

describe('blobToDataUrl', () => {
  it('reads an image blob into a data URL', async () => {
    const blob = new Blob(['hello'], { type: 'image/png' });
    const result = await blobToDataUrl(blob);
    expect(result.startsWith('data:image/png')).toBe(true);
  });
});
