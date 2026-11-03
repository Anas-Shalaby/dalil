import { MAX_LABEL_LENGTH } from './constants';

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dalil-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function truncateText(value: string, maxLength = MAX_LABEL_LENGTH): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getHostFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export interface PageSupport {
  supported: boolean;
  reason?: string;
}

export function getPageSupport(url: string | undefined): PageSupport {
  if (!url) {
    return {
      supported: false,
      reason: 'تعذّر قراءة عنوان هذه الصفحة. أعد فتح دليل من شريط الأدوات.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { supported: false, reason: 'عنوان الصفحة غير صالح للتسجيل.' };
  }

  if (
    parsed.protocol === 'chrome:' ||
    parsed.protocol === 'edge:' ||
    parsed.protocol === 'about:' ||
    parsed.protocol === 'devtools:' ||
    parsed.protocol === 'view-source:'
  ) {
    return {
      supported: false,
      reason: 'صفحات المتصفح الداخلية محمية ولا يمكن التسجيل فيها.',
    };
  }

  if (parsed.protocol === 'chrome-extension:') {
    return {
      supported: false,
      reason: 'لا يمكن التسجيل داخل صفحات الإضافات الأخرى.',
    };
  }

  if (parsed.protocol === 'file:') {
    return {
      supported: false,
      reason: 'لا يعمل دليل على ملفات المتصفح المحلية بصيغة file://.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      supported: false,
      reason: 'يدعم دليل صفحات الويب العادية فقط.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'chromewebstore.google.com' ||
    (host === 'chrome.google.com' && parsed.pathname.startsWith('/webstore'))
  ) {
    return {
      supported: false,
      reason: 'متجر Chrome محمي ولا يسمح للتوسعات بالعمل داخله.',
    };
  }

  return { supported: true };
}

export function formatRelativeDate(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير معروف';

  const diffMs = date.getTime() - now;
  const diffMinutes = Math.round(diffMs / 60_000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 1) return 'الآن';
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day');

  return new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير معروف';
  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

export function formatDateOnly(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير معروف';
  return new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDuration(startedAt: string, now = Date.now()): string {
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor((now - started) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatStepCount(count: number): string {
  if (count === 0) return 'لا توجد خطوات';
  if (count === 1) return 'خطوة واحدة';
  if (count === 2) return 'خطوتان';
  if (count >= 3 && count <= 10) return `${count} خطوات`;
  return `${count} خطوة`;
}

export function formatGuideCount(count: number): string {
  if (count === 0) return 'لا توجد أدلة';
  if (count === 1) return 'دليل واحد';
  if (count === 2) return 'دليلان';
  if (count >= 3 && count <= 10) return `${count} أدلة`;
  return `${count} دليلًا`;
}

export function titleFromPage(pageTitle: string, host: string | null): string {
  const normalized = truncateText(pageTitle || '', 75);
  if (normalized) return normalized;
  if (host) return `دليل ${host}`;
  return 'دليل جديد';
}

export function sortGuidesByUpdated<T extends { updatedAt: string }>(guides: T[]): T[] {
  return [...guides].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function isMeaningfulLabel(label: string): boolean {
  const normalized = label.trim();
  if (!normalized) return false;
  if (normalized.length > 2) return true;
  return /[A-Za-z\u0600-\u06FF]/.test(normalized);
}
