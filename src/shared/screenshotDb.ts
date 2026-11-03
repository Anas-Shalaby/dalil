import {
  SCREENSHOT_DB_NAME,
  SCREENSHOT_DB_VERSION,
  SCREENSHOT_STORE_NAME,
} from './constants';
import type { StoredScreenshot } from './types';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(SCREENSHOT_DB_NAME, SCREENSHOT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SCREENSHOT_STORE_NAME)) {
        const store = db.createObjectStore(SCREENSHOT_STORE_NAME, { keyPath: 'id' });
        store.createIndex('guideId', 'guideId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Unable to open screenshot storage.'));
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error('Screenshot storage is blocked by another extension page.'));
    };
  });

  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Screenshot request failed.'));
  });
}

export async function putScreenshot(record: StoredScreenshot): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOT_STORE_NAME, 'readwrite');
    transaction.objectStore(SCREENSHOT_STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Unable to save screenshot.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Screenshot save was aborted.'));
  });
}

export async function getScreenshot(id: string): Promise<StoredScreenshot | null> {
  const db = await openDatabase();
  const transaction = db.transaction(SCREENSHOT_STORE_NAME, 'readonly');
  const result = await requestToPromise<StoredScreenshot | undefined>(
    transaction.objectStore(SCREENSHOT_STORE_NAME).get(id),
  );
  return result ?? null;
}

export async function deleteScreenshot(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOT_STORE_NAME, 'readwrite');
    transaction.objectStore(SCREENSHOT_STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Unable to delete screenshot.'));
  });
}

export async function getScreenshotsForGuide(guideId: string): Promise<StoredScreenshot[]> {
  const db = await openDatabase();
  const transaction = db.transaction(SCREENSHOT_STORE_NAME, 'readonly');
  const index = transaction.objectStore(SCREENSHOT_STORE_NAME).index('guideId');
  return requestToPromise<StoredScreenshot[]>(index.getAll(guideId));
}

export async function deleteScreenshotsForGuide(guideId: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SCREENSHOT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SCREENSHOT_STORE_NAME);
    const index = store.index('guideId');
    const request = index.openKeyCursor(IDBKeyRange.only(guideId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Unable to delete guide screenshots.'));
  });
}
