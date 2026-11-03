import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileToLogoDataUrl, validateLogoFile } from './logo';
import { MAX_LOGO_DIMENSION, MAX_LOGO_FILE_BYTES } from './settings';

const logoDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lVf1WQAAAABJRU5ErkJggg==';

function logoFile(type = 'image/png', bytes = 1024): File {
  return new File([new Uint8Array(bytes)], 'logo.png', { type });
}

function stubCanvas(dataUrl = logoDataUrl) {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    drawImage,
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(dataUrl);
  return { drawImage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('logo processing', () => {
  it('accepts PNG, JPEG and WebP files', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(() => validateLogoFile(logoFile(type))).not.toThrow();
    }
  });

  it('rejects unsupported file types with an Arabic message', () => {
    expect(() => validateLogoFile(new File(['x'], 'logo.svg', { type: 'image/svg+xml' }))).toThrow(
      'اختر شعارًا بصيغة PNG أو JPG أو WebP.',
    );
  });

  it('rejects oversized files before decoding', () => {
    expect(() => validateLogoFile(logoFile('image/png', MAX_LOGO_FILE_BYTES + 1))).toThrow(
      'حجم الشعار كبير. الحد الأقصى 1 ميجابايت.',
    );
  });

  it('reports unreadable images without leaking technical errors', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => {
      throw new Error('decode failed');
    }));
    await expect(fileToLogoDataUrl(logoFile())).rejects.toThrow(
      'تعذّر قراءة الشعار. جرّب صورة أخرى.',
    );
  });

  it('downscales large logos locally and returns a PNG data URL', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4000, height: 2000, close })),
    );
    stubCanvas();
    const dataUrl = await fileToLogoDataUrl(logoFile());
    expect(dataUrl).toBe(logoDataUrl);
    expect(close).toHaveBeenCalled();
    expect(MAX_LOGO_DIMENSION).toBe(1600);
  });

  it('rejects images with invalid dimensions', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 0, height: 0, close: vi.fn() })),
    );
    stubCanvas();
    await expect(fileToLogoDataUrl(logoFile())).rejects.toThrow('أبعاد الشعار غير صالحة.');
  });

  it('rejects logos that stay too large after processing', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 800, height: 800, close: vi.fn() })),
    );
    stubCanvas(`data:image/png;base64,${'A'.repeat(2_800_001)}`);
    await expect(fileToLogoDataUrl(logoFile())).rejects.toThrow(
      'الشعار كبير جدًا بعد المعالجة. جرّب صورة أبسط.',
    );
  });
});
