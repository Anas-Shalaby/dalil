import { MAX_LOGO_DATA_URL_LENGTH, MAX_LOGO_DIMENSION, MAX_LOGO_FILE_BYTES } from './settings';

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp';

export function validateLogoFile(file: File): void {
  if (!LOGO_TYPES.includes(file.type)) {
    throw new Error('اختر شعارًا بصيغة PNG أو JPG أو WebP.');
  }
  if (file.size > MAX_LOGO_FILE_BYTES) {
    throw new Error('حجم الشعار كبير. الحد الأقصى 1 ميجابايت.');
  }
}

export async function fileToLogoDataUrl(file: File): Promise<string> {
  validateLogoFile(file);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('تعذّر قراءة الشعار. جرّب صورة أخرى.');
  }

  try {
    if (bitmap.width <= 0 || bitmap.height <= 0) {
      throw new Error('أبعاد الشعار غير صالحة.');
    }
    const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذّر تجهيز الشعار.');
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
      throw new Error('الشعار كبير جدًا بعد المعالجة. جرّب صورة أبسط.');
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
