import { openEditorPage, openLibraryPage, openPrintPage } from '../shared/chrome';
import { logCaptureError } from './errors';
import { ChromeCaptureGuideStore, type CaptureGuideStore } from './guideStore';
import { ChromeDesktopSourcePicker, type DesktopSourcePicker } from './desktopCapture';
import { ChromeCaptureLock, focusBrowserTab, type CaptureLock } from './sessionLock';
import { DesktopStreamManager } from './streamManager';

export interface CaptureServices {
  picker: DesktopSourcePicker;
  streams: DesktopStreamManager;
  guides: CaptureGuideStore;
  lock: CaptureLock;
  openEditor(guideId: string): Promise<void>;
  openPrint(guideId: string): Promise<void>;
  openLibrary(): Promise<void>;
  focusTab(tabId: number): Promise<void>;
  logError(context: string, error: unknown): void;
}

export function createChromeCaptureServices(): CaptureServices {
  return {
    picker: new ChromeDesktopSourcePicker(),
    streams: new DesktopStreamManager(),
    guides: new ChromeCaptureGuideStore(),
    lock: new ChromeCaptureLock(),
    openEditor: openEditorPage,
    openPrint: openPrintPage,
    openLibrary: openLibraryPage,
    focusTab: focusBrowserTab,
    logError: logCaptureError,
  };
}
