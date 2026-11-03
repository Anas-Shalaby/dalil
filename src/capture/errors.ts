export type CaptureErrorCode =
  | 'source-cancelled'
  | 'source-unavailable'
  | 'source-busy'
  | 'permission-denied'
  | 'connect-failed'
  | 'no-video-track'
  | 'stream-active'
  | 'video-not-ready'
  | 'empty-frame'
  | 'frame-failed'
  | 'frame-too-large'
  | 'source-ended'
  | 'storage-full'
  | 'storage-failed'
  | 'session-conflict'
  | 'unknown';

export interface CaptureErrorState {
  code: CaptureErrorCode;
  message: string;
}

const MESSAGES: Record<CaptureErrorCode, string> = {
  'source-cancelled': 'لم يتم اختيار نافذة أو شاشة. يمكنك المحاولة مرة أخرى.',
  'source-unavailable': 'تعذّر فتح نافذة اختيار المصدر. حاول مرة أخرى.',
  'source-busy': 'نافذة اختيار المصدر مفتوحة بالفعل. أكمل الاختيار أولًا.',
  'permission-denied': 'لم يُمنح إذن الوصول إلى مصدر الالتقاط. أعد المحاولة واختر المصدر.',
  'connect-failed': 'تعذّر الاتصال بمصدر الالتقاط، حاول مرة أخرى.',
  'no-video-track': 'لم يُرجع المصدر صورة صالحة. اختر نافذة أخرى.',
  'stream-active': 'هناك اتصال نشط بالفعل بمصدر الالتقاط.',
  'video-not-ready': 'لم يكن مصدر الالتقاط جاهزًا. انتظر لحظة ثم أعد المحاولة.',
  'empty-frame': 'تعذّر التقاط الصورة. لم يحتوي المصدر على صورة صالحة.',
  'frame-failed': 'تعذّر التقاط الصورة. حاول مرة أخرى.',
  'frame-too-large': 'الصورة الملتقطة أكبر من الحد المسموح. جرّب نافذة أصغر.',
  'source-ended': 'انتهى مصدر الالتقاط. اختر نافذة أو شاشة من جديد لمتابعة التوثيق.',
  'storage-full': 'لا توجد مساحة كافية لحفظ هذا الدليل. احذف أدلة قديمة ثم أعد المحاولة.',
  'storage-failed': 'تعذّر حفظ الدليل على جهازك. حاول مرة أخرى.',
  'session-conflict': 'هناك جلسة التقاط مفتوحة بالفعل في نافذة أخرى. أكملها أولًا.',
  unknown: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
};

export class CaptureError extends Error {
  readonly code: CaptureErrorCode;

  constructor(code: CaptureErrorCode, technicalMessage?: string, options?: ErrorOptions) {
    super(technicalMessage ?? MESSAGES[code], options);
    this.name = 'CaptureError';
    this.code = code;
  }
}

export function captureErrorMessage(code: CaptureErrorCode): string {
  return MESSAGES[code];
}

export function isCaptureError(value: unknown): value is CaptureError {
  return value instanceof CaptureError;
}

export function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'QuotaExceededError';
  }
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name?: unknown }).name)
      : '';
  return name === 'QuotaExceededError';
}

export function classifyMediaError(error: unknown): CaptureError {
  if (isCaptureError(error)) return error;
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name?: unknown }).name)
      : '';

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new CaptureError('permission-denied', undefined, { cause: error });
  }
  if (name === 'NotFoundError' || name === 'NotReadableError') {
    return new CaptureError('source-unavailable', undefined, { cause: error });
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return new CaptureError('connect-failed', undefined, { cause: error });
  }
  return new CaptureError('connect-failed', undefined, { cause: error });
}

export function classifyStorageError(error: unknown): CaptureError {
  if (isCaptureError(error)) return error;
  if (isQuotaError(error)) {
    return new CaptureError('storage-full', undefined, { cause: error });
  }
  return new CaptureError('storage-failed', undefined, { cause: error });
}

export function toCaptureErrorState(error: unknown): CaptureErrorState {
  const captureError = isCaptureError(error)
    ? error
    : isQuotaError(error)
      ? classifyStorageError(error)
      : new CaptureError('unknown', undefined, { cause: error });
  return { code: captureError.code, message: MESSAGES[captureError.code] };
}

export function toUserMessage(error: unknown): string {
  return toCaptureErrorState(error).message;
}

export function logCaptureError(context: string, error: unknown): void {
  // Technical detail stays in the console; the UI only shows Arabic messages.
  console.error(`[Dalil capture] ${context}`, error);
}
