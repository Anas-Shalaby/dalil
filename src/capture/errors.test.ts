import { describe, expect, it } from 'vitest';
import {
  CaptureError,
  captureErrorMessage,
  classifyMediaError,
  classifyStorageError,
  isQuotaError,
  toCaptureErrorState,
  toUserMessage,
} from './errors';

describe('capture error mapping', () => {
  it('maps media permission errors to an Arabic message', () => {
    const error = classifyMediaError(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
    expect(error.code).toBe('permission-denied');
    expect(toUserMessage(error)).toContain('لم يُمنح إذن الوصول');
  });

  it('maps missing devices to source-unavailable', () => {
    const error = classifyMediaError(Object.assign(new Error('x'), { name: 'NotFoundError' }));
    expect(error.code).toBe('source-unavailable');
  });

  it('never leaks English technical text through user messages', () => {
    const error = new CaptureError('frame-failed', 'canvas.toBlob threw an English error');
    expect(toUserMessage(error)).toBe(captureErrorMessage('frame-failed'));
    expect(toUserMessage(error)).not.toContain('canvas');
  });

  it('maps quota failures to a storage-full message', () => {
    const quota = Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    expect(isQuotaError(quota)).toBe(true);
    expect(classifyStorageError(quota).code).toBe('storage-full');
    expect(toCaptureErrorState(quota).message).toContain('لا توجد مساحة كافية');
  });

  it('turns unknown errors into a generic Arabic message', () => {
    expect(toCaptureErrorState(new Error('boom'))).toEqual({
      code: 'unknown',
      message: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    });
  });
});
