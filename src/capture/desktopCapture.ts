import { CaptureError } from './errors';

export type DesktopCaptureSource = 'screen' | 'window' | 'tab';

// Window first: documenting an external app with a window source keeps the
// Dalil tab out of the captured image.
export const DEFAULT_DESKTOP_SOURCES: DesktopCaptureSource[] = ['window', 'screen', 'tab'];

export interface DesktopSourceChoice {
  streamId: string;
  canRequestAudioTrack: boolean;
}

export interface DesktopSourcePicker {
  choose(sources?: DesktopCaptureSource[]): Promise<DesktopSourceChoice | null>;
  cancel(): void;
  isPending(): boolean;
}

interface ChromeDesktopCaptureApi {
  chooseDesktopMedia(
    sources: DesktopCaptureSource[],
    callback: (streamId: string, options: { canRequestAudioTrack: boolean }) => void,
  ): number;
  cancelChooseDesktopMedia(requestId: number): void;
}

function getDesktopCaptureApi(): ChromeDesktopCaptureApi {
  const api = (globalThis as { chrome?: typeof chrome }).chrome?.desktopCapture as
    | ChromeDesktopCaptureApi
    | undefined;
  if (!api) {
    throw new CaptureError(
      'source-unavailable',
      'chrome.desktopCapture is unavailable. Check the desktopCapture permission.',
    );
  }
  return api;
}

/**
 * Thin adapter around chrome.desktopCapture so session logic can be tested
 * without the real picker dialog.
 */
export class ChromeDesktopSourcePicker implements DesktopSourcePicker {
  private requestId: number | null = null;
  private pending = false;
  private pendingSettle: ((result: DesktopSourceChoice | null) => void) | null = null;

  isPending(): boolean {
    return this.pending;
  }

  choose(
    sources: DesktopCaptureSource[] = DEFAULT_DESKTOP_SOURCES,
  ): Promise<DesktopSourceChoice | null> {
    if (this.pending) {
      return Promise.reject(new CaptureError('source-busy'));
    }

    this.pending = true;

    return new Promise<DesktopSourceChoice | null>((resolve, reject) => {
      let settled = false;
      const settle = (result: DesktopSourceChoice | null) => {
        if (settled) return;
        settled = true;
        this.pending = false;
        this.requestId = null;
        this.pendingSettle = null;
        resolve(result);
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        this.pending = false;
        this.requestId = null;
        this.pendingSettle = null;
        reject(
          error instanceof CaptureError
            ? error
            : new CaptureError('source-unavailable', 'chooseDesktopMedia failed.', {
                cause: error,
              }),
        );
      };

      this.pendingSettle = settle;

      try {
        const api = getDesktopCaptureApi();
        this.requestId = api.chooseDesktopMedia(sources, (streamId, options) => {
          // Chrome calls the callback with an empty id when the user cancels.
          if (!streamId) {
            settle(null);
            return;
          }
          settle({
            streamId,
            canRequestAudioTrack: Boolean(options?.canRequestAudioTrack),
          });
        });
      } catch (error) {
        fail(error);
      }
    });
  }

  cancel(): void {
    if (this.requestId !== null) {
      try {
        getDesktopCaptureApi().cancelChooseDesktopMedia(this.requestId);
      } catch {
        // The picker may already be closed.
      }
    }
    // The API is not guaranteed to invoke the callback after cancellation, so
    // settle locally to keep the UI out of an endless "selecting" state.
    this.pendingSettle?.(null);
    this.pendingSettle = null;
    this.requestId = null;
    this.pending = false;
  }
}
