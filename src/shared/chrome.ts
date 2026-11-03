import { getHostFromUrl, getPageSupport } from './format';
import type { RuntimeMessage } from './messages';
import type { ActiveTabInfo } from './types';

export function sendRuntimeMessage<T>(message: RuntimeMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

export function buildActiveTabInfo(tab: chrome.tabs.Tab | undefined): ActiveTabInfo | null {
  if (!tab || typeof tab.id !== 'number') return null;
  const support = getPageSupport(tab.url);
  return {
    id: tab.id,
    title: tab.title?.trim() || 'صفحة بدون عنوان',
    url: tab.url ?? '',
    host: getHostFromUrl(tab.url),
    supported: support.supported,
    unsupportedReason: support.reason,
  };
}

export async function getActiveTabInfo(): Promise<ActiveTabInfo | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return buildActiveTabInfo(tab);
}

export function extensionUrl(path: string): string {
  return chrome.runtime.getURL(path);
}

export async function openEditorPage(guideId: string): Promise<void> {
  await chrome.tabs.create({
    url: extensionUrl(`editor.html?id=${encodeURIComponent(guideId)}`),
  });
}

export async function openLibraryPage(): Promise<void> {
  await chrome.tabs.create({ url: extensionUrl('library.html') });
}

export async function openPrintPage(guideId: string): Promise<void> {
  await chrome.tabs.create({
    url: extensionUrl(`print.html?id=${encodeURIComponent(guideId)}`),
  });
}

export async function openStudioPage(guideId: string): Promise<void> {
  await chrome.tabs.create({
    url: extensionUrl(`studio.html?id=${encodeURIComponent(guideId)}`),
  });
}

export async function openCapturePage(guideId?: string): Promise<void> {
  const query = guideId ? `?guide=${encodeURIComponent(guideId)}` : '';
  await chrome.tabs.create({ url: extensionUrl(`capture.html${query}`) });
}

export async function openPrivacyPage(): Promise<void> {
  const existing = await chrome.tabs.query({
    url: extensionUrl('privacy.html'),
  });
  if (existing[0]?.id) {
    await chrome.tabs.update(existing[0].id, { active: true });
    if (typeof existing[0].windowId === 'number') {
      await chrome.windows.update(existing[0].windowId, { focused: true });
    }
    return;
  }
  await chrome.tabs.create({ url: extensionUrl('privacy.html') });
}

export function getGuideIdFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get('id');
}

export function getCaptureGuideIdFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get('guide');
}

export function humanizeBrowserError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/cannot access|missing host permission|not allowed|extensions gallery/i.test(message)) {
    return 'تعذّر الوصول إلى هذه الصفحة. جرّب صفحة ويب عادية، أو أعد فتح دليل من شريط الأدوات.';
  }
  if (/permission/i.test(message)) {
    return 'لم يُمنح الإذن المؤقت لهذا التبويب. أعد فتح النافذة من شريط الأدوات وحاول مجددًا.';
  }
  if (/quota|storage/i.test(message)) {
    return 'تعذّر الحفظ محليًا. قد تكون مساحة التخزين ممتلئة.';
  }
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}
