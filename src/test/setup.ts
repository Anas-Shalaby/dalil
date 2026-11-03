import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

type StorageItems = Record<string, unknown>;

const storage = new Map<string, unknown>();

function readKeys(keys?: string | string[] | StorageItems | null): StorageItems {
  if (keys == null) return Object.fromEntries(storage);
  if (typeof keys === 'string') {
    return storage.has(keys) ? { [keys]: storage.get(keys) } : {};
  }
  if (Array.isArray(keys)) {
    return Object.fromEntries(
      keys.filter((key) => storage.has(key)).map((key) => [key, storage.get(key)]),
    );
  }
  return Object.fromEntries(
    Object.entries(keys).map(([key, fallback]) => [
      key,
      storage.has(key) ? storage.get(key) : fallback,
    ]),
  );
}

const storageArea = {
  get: vi.fn(async (keys?: string | string[] | StorageItems | null) => readKeys(keys)),
  set: vi.fn(async (items: StorageItems) => {
    for (const [key, value] of Object.entries(items)) storage.set(key, value);
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) storage.delete(key);
  }),
  clear: vi.fn(async () => {
    storage.clear();
  }),
};

const tabsApi = {
  getCurrent: vi.fn(async () => ({ id: 1, windowId: 1 })),
  get: vi.fn(async (tabId: number) => ({ id: tabId, windowId: 1 })),
  update: vi.fn(async () => ({ id: 1 })),
  create: vi.fn(async () => ({ id: 2 })),
  query: vi.fn(async () => []),
  sendMessage: vi.fn(async () => ({ ok: true })),
};

const chromeMock = {
  storage: { local: storageArea },
  tabs: tabsApi,
  windows: { update: vi.fn(async () => ({ id: 1 })) },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://dalil-test/${path}`),
    sendMessage: vi.fn(async () => ({ ok: true })),
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
  },
  action: {
    setBadgeBackgroundColor: vi.fn(async () => undefined),
    setBadgeTextColor: vi.fn(async () => undefined),
    setBadgeText: vi.fn(async () => undefined),
  },
  desktopCapture: undefined as unknown,
};

Object.defineProperty(globalThis, 'chrome', {
  value: chromeMock,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  storage.clear();
  storageArea.get.mockClear();
  storageArea.set.mockClear();
  storageArea.remove.mockClear();
  storageArea.clear.mockClear();

  tabsApi.getCurrent.mockReset();
  tabsApi.getCurrent.mockImplementation(async () => ({ id: 1, windowId: 1 }));
  tabsApi.get.mockReset();
  tabsApi.get.mockImplementation(async (tabId: number) => ({ id: tabId, windowId: 1 }));
  tabsApi.update.mockReset();
  tabsApi.update.mockImplementation(async () => ({ id: 1 }));
  tabsApi.create.mockReset();
  tabsApi.create.mockImplementation(async () => ({ id: 2 }));
  tabsApi.query.mockReset();
  tabsApi.query.mockImplementation(async () => []);
  tabsApi.sendMessage.mockReset();
  tabsApi.sendMessage.mockImplementation(async () => ({ ok: true }));

  chromeMock.windows.update.mockReset();
  chromeMock.windows.update.mockImplementation(async () => ({ id: 1 }));
  chromeMock.runtime.sendMessage.mockReset();
  chromeMock.runtime.sendMessage.mockImplementation(async () => ({ ok: true }));
  chromeMock.desktopCapture = undefined;
});

afterEach(() => {
  cleanup();
});

export { chromeMock, storageArea };
