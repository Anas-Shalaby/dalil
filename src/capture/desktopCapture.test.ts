import { describe, expect, it, vi } from 'vitest';
import { ChromeDesktopSourcePicker, DEFAULT_DESKTOP_SOURCES } from './desktopCapture';

interface FakeDesktopApi {
  chooseDesktopMedia: ReturnType<typeof vi.fn>;
  cancelChooseDesktopMedia: ReturnType<typeof vi.fn>;
}

function installDesktopCapture(): FakeDesktopApi {
  const api: FakeDesktopApi = {
    chooseDesktopMedia: vi.fn(),
    cancelChooseDesktopMedia: vi.fn(),
  };
  (chrome as unknown as { desktopCapture: FakeDesktopApi }).desktopCapture = api;
  return api;
}

describe('ChromeDesktopSourcePicker', () => {
  it('requests window first so the extension tab stays out of captures', async () => {
    const api = installDesktopCapture();
    const picker = new ChromeDesktopSourcePicker();
    expect(DEFAULT_DESKTOP_SOURCES[0]).toBe('window');

    const promise = picker.choose();
    expect(api.chooseDesktopMedia).toHaveBeenCalledWith(
      ['window', 'screen', 'tab'],
      expect.any(Function),
    );
    const callback = api.chooseDesktopMedia.mock.calls[0][1] as (
      streamId: string,
      options: { canRequestAudioTrack: boolean },
    ) => void;
    callback('stream-1', { canRequestAudioTrack: false });
    await expect(promise).resolves.toEqual({
      streamId: 'stream-1',
      canRequestAudioTrack: false,
    });
  });

  it('treats an empty stream id as cancellation', async () => {
    const api = installDesktopCapture();
    const picker = new ChromeDesktopSourcePicker();
    const promise = picker.choose();
    const callback = api.chooseDesktopMedia.mock.calls[0][1] as (streamId: string) => void;
    callback('');
    await expect(promise).resolves.toBeNull();
    expect(picker.isPending()).toBe(false);
  });

  it('cancels the Chrome picker and settles locally', async () => {
    const api = installDesktopCapture();
    api.chooseDesktopMedia.mockReturnValue(42);
    const picker = new ChromeDesktopSourcePicker();
    const promise = picker.choose();
    picker.cancel();

    expect(api.cancelChooseDesktopMedia).toHaveBeenCalledWith(42);
    await expect(promise).resolves.toBeNull();
    expect(picker.isPending()).toBe(false);
  });

  it('rejects a second concurrent picker request', async () => {
    const api = installDesktopCapture();
    api.chooseDesktopMedia.mockReturnValue(7);
    const picker = new ChromeDesktopSourcePicker();
    const first = picker.choose();
    await expect(picker.choose()).rejects.toMatchObject({ code: 'source-busy' });
    picker.cancel();
    await expect(first).resolves.toBeNull();
  });

  it('reports a missing chrome.desktopCapture permission', async () => {
    const picker = new ChromeDesktopSourcePicker();
    await expect(picker.choose()).rejects.toMatchObject({ code: 'source-unavailable' });
    expect(picker.isPending()).toBe(false);
  });

  it('reports synchronous Chrome API failures', async () => {
    const api = installDesktopCapture();
    api.chooseDesktopMedia.mockImplementation(() => {
      throw new Error('api exploded');
    });
    const picker = new ChromeDesktopSourcePicker();
    await expect(picker.choose()).rejects.toMatchObject({ code: 'source-unavailable' });
    expect(picker.isPending()).toBe(false);
  });
});
