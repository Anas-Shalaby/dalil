import type { CaptureSurface } from '../shared/types';

export function surfaceLabel(surface: CaptureSurface): string {
  switch (surface) {
    case 'window':
      return 'نافذة محددة';
    case 'screen':
      return 'الشاشة الكاملة';
    case 'tab':
      return 'تبويب محدد';
    default:
      return 'مصدر سطح المكتب';
  }
}

export function detectCaptureSurface(
  settings: MediaTrackSettings | Record<string, unknown> | null | undefined,
): CaptureSurface {
  const value =
    settings && typeof settings === 'object'
      ? (settings as Record<string, unknown>).displaySurface
      : undefined;
  if (value === 'window') return 'window';
  if (value === 'monitor' || value === 'screen') return 'screen';
  if (value === 'browser' || value === 'tab') return 'tab';
  return 'unknown';
}
