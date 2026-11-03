export const GUIDES_STORAGE_KEY = 'dalil:guides:v1';
export const RECORDING_STORAGE_KEY = 'dalil:recording:v1';
export const NOTICE_STORAGE_KEY = 'dalil:last-notice:v1';
export const CAPTURE_SESSION_STORAGE_KEY = 'dalil:capture-session:v1';
export const PDF_PRESETS_STORAGE_KEY = 'dalil:pdf-presets:v1';
export const PDF_DESIGNS_STORAGE_KEY = 'dalil:pdf-designs:v1';

export const SCREENSHOT_DB_NAME = 'dalil-media';
export const SCREENSHOT_STORE_NAME = 'screenshots';
export const SCREENSHOT_DB_VERSION = 1;

export const MAX_INSTRUCTION_LENGTH = 500;
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 400;
export const MAX_LABEL_LENGTH = 90;
export const MAX_IMPORTED_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_SCREENSHOT_WIDTH = 1500;
export const MAX_SCREENSHOT_HEIGHT = 2200;

// Desktop frames keep more detail so small UI text in desktop apps stays legible
// when printed to A4. Images still live in IndexedDB, not chrome.storage.local.
export const MAX_CAPTURE_WIDTH = 1920;
export const MAX_CAPTURE_HEIGHT = 2400;
export const CAPTURE_JPEG_QUALITY = 0.86;
export const MAX_CAPTURED_IMAGE_BYTES = 12 * 1024 * 1024;
export const CAPTURE_LOCK_STALE_MS = 12 * 60 * 60 * 1000;
export const CAPTURE_CONNECT_TIMEOUT_MS = 15_000;

export const DEFAULT_GUIDE_TITLE = 'دليل جديد';
export const PRODUCT_NAME = 'دليل';
