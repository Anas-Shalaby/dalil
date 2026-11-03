import { describe, expect, it, vi } from 'vitest';
import {
  DesktopStreamManager,
  type CaptureVideoElement,
  type MediaStreamProvider,
} from './streamManager';

class FakeTrack {
  readonly listeners = new Map<string, Set<EventListener>>();
  stop = vi.fn();
  settings: MediaTrackSettings = { displaySurface: 'window' };

  addEventListener(type: string, listener: EventListener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }

  getSettings() {
    return this.settings;
  }
}

class FakeStream {
  constructor(readonly tracks: FakeTrack[]) {}
  getVideoTracks() {
    return this.tracks;
  }
  getTracks() {
    return this.tracks;
  }
}

class FakeVideo implements CaptureVideoElement {
  srcObject: MediaProvider | null = null;
  muted = false;
  playsInline = false;
  autoplay = false;
  readyState = 2;
  videoWidth = 1280;
  videoHeight = 720;
  listeners = new Map<string, Set<EventListener>>();
  play = vi.fn(async () => undefined);
  pause = vi.fn();

  addEventListener(type: string, listener: EventListener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }
}

function setup(options: { track?: FakeTrack; width?: number; height?: number } = {}) {
  const track = options.track ?? new FakeTrack();
  const stream = new FakeStream([track]);
  const media: MediaStreamProvider = { getUserMedia: vi.fn(async () => stream as unknown as MediaStream) };
  const video = new FakeVideo();
  if (options.width !== undefined) video.videoWidth = options.width;
  if (options.height !== undefined) video.videoHeight = options.height;
  const manager = new DesktopStreamManager({
    media,
    videoFactory: { create: () => video },
    connectTimeoutMs: 50,
  });
  return { manager, media, video, track, stream };
}

describe('DesktopStreamManager', () => {
  it('connects with Chrome desktop constraints and no audio', async () => {
    const { manager, media } = setup();
    const onEnded = vi.fn();
    const connection = await manager.connect('stream-42', onEnded);

    expect(media.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: 'stream-42',
          maxFrameRate: 30,
        },
      },
    });
    expect(connection).toMatchObject({ surface: 'window', width: 1280, height: 720 });
    expect(manager.isActive()).toBe(true);
  });

  it('rejects a second stream instead of duplicating capture', async () => {
    const { manager } = setup();
    await manager.connect('stream-1', () => undefined);
    await expect(manager.connect('stream-2', () => undefined)).rejects.toMatchObject({
      code: 'stream-active',
    });
    manager.stop();
  });

  it('stops the stream and removes listeners', async () => {
    const { manager, track } = setup();
    await manager.connect('stream-1', () => undefined);
    manager.stop();

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(track.listeners.get('ended')?.size ?? 0).toBe(0);
    expect(manager.isActive()).toBe(false);
  });

  it('notifies once and releases the stream when the source ends', async () => {
    const { manager, track } = setup();
    const onEnded = vi.fn();
    await manager.connect('stream-1', onEnded);

    track.emit('ended');
    track.emit('ended');

    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalled();
    expect(manager.isActive()).toBe(false);
  });

  it('rejects empty stream ids before touching media', async () => {
    const { manager, media } = setup();
    await expect(manager.connect('', () => undefined)).rejects.toMatchObject({
      code: 'source-unavailable',
    });
    expect(media.getUserMedia).not.toHaveBeenCalled();
  });

  it('fails when the stream has no video track and stops all tracks', async () => {
    const track = new FakeTrack();
    const stream = new FakeStream([]);
    const manager = new DesktopStreamManager({
      media: { getUserMedia: vi.fn(async () => stream as unknown as MediaStream) },
      videoFactory: { create: () => new FakeVideo() },
      connectTimeoutMs: 50,
    });

    await expect(manager.connect('stream-1', () => undefined)).rejects.toMatchObject({
      code: 'no-video-track',
    });
    expect(track.stop).not.toHaveBeenCalled();
    expect(manager.isActive()).toBe(false);
  });

  it('maps permission errors to Arabic-ready codes', async () => {
    const manager = new DesktopStreamManager({
      media: {
        getUserMedia: vi.fn(async () => {
          throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
        }),
      },
      videoFactory: { create: () => new FakeVideo() },
    });

    await expect(manager.connect('stream-1', () => undefined)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('releases the stream when the video reports zero dimensions', async () => {
    const { manager, track } = setup({ width: 0, height: 0 });
    await expect(manager.connect('stream-1', () => undefined)).rejects.toMatchObject({
      code: 'connect-failed',
    });
    expect(track.stop).toHaveBeenCalled();
    expect(manager.isActive()).toBe(false);
  });

  it('refuses to capture without a connected video', async () => {
    const { manager } = setup();
    await expect(manager.capture()).rejects.toMatchObject({ code: 'video-not-ready' });
  });
});
