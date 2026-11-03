import {
  MAX_IMPORTED_IMAGE_BYTES,
  MAX_SCREENSHOT_HEIGHT,
  MAX_SCREENSHOT_WIDTH,
} from './constants';

const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export async function fileToScreenshotDataUrl(file: File): Promise<string> {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('اختر صورة بصيغة PNG أو JPG أو WebP.');
  }
  if (file.size > MAX_IMPORTED_IMAGE_BYTES) {
    throw new Error('حجم الصورة كبير. الحد الأقصى 10 ميجابايت.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('تعذّر قراءة الصورة. حاول اختيار صورة أخرى.');
  }

  try {
    const scale = Math.min(
      1,
      MAX_SCREENSHOT_WIDTH / bitmap.width,
      MAX_SCREENSHOT_HEIGHT / bitmap.height,
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذّر تجهيز الصورة.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.84);
  } catch {
    throw new Error('تعذّر معالجة الصورة. حاول اختيار صورة أصغر.');
  } finally {
    bitmap.close();
  }
}
