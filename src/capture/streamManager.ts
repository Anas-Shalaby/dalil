import { CAPTURE_CONNECT_TIMEOUT_MS } from '../shared/constants';
import type { CaptureSurface } from '../shared/types';
import { CaptureError, classifyMediaError } from './errors';
import { captureFrameFromVideo, type CapturedFrame, type FrameCaptureDeps } from './frameCapture';
import { detectCaptureSurface, surfaceLabel } from './sourceInfo';

export interface MediaStreamProvider {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
}

export const browserMediaStreamProvider: MediaStreamProvider = {
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
};

interface ChromeDesktopTrackConstraints extends MediaTrackConstraints {
  mandatory?: {
    chromeMediaSource: 'desktop';
    chromeMediaSourceId: string;
    maxFrameRate?: number;
  };
}

export interface CaptureVideoElement {
  srcObject: MediaProvider | null;
  muted: boolean;
  playsInline: boolean;
  autoplay: boolean;
  readyState: number;
  videoWidth: number;
  videoHeight: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

export interface VideoElementFactory {
  create(): CaptureVideoElement;
}

export const domVideoElementFactory: VideoElementFactory = {
  create: () => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    return video;
  },
};

export interface StreamConnection {
  surface: CaptureSurface;
  label: string;
  width: number;
  height: number;
}

export interface StreamManagerDeps {
  media?: MediaStreamProvider;
  videoFactory?: VideoElementFactory;
  connectTimeoutMs?: number;
  captureDeps?: FrameCaptureDeps;
}

interface TrackListener {
  track: MediaStreamTrack;
  listener: () => void;
}

function waitForVideoEvent(
  video: CaptureVideoElement,
  eventName: string,
  timeoutMs: number,
  details: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener('error', onError);
      clearTimeout(timer);
    };
    const onEvent = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new CaptureError('connect-failed', `Video emitted an error while ${details}.`));
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new CaptureError('connect-failed', `Timed out while ${details}.`));
    }, timeoutMs);

    video.addEventListener(eventName, onEvent);
    video.addEventListener('error', onError);

    // The event may already have fired before the listener was attached.
    if (eventName === 'loadedmetadata' && video.readyState >= 2) {
      onEvent();
    } else if (eventName === 'resize' && video.videoWidth > 0 && video.videoHeight > 0) {
      onEvent();
    }
  });
}

/**
 * Owns exactly one MediaStream and one hidden video element for a capture
 * session. All Chrome media APIs are injected so the class is testable.
 */
export class DesktopStreamManager {
  private stream: MediaStream | null = null;
  private video: CaptureVideoElement | null = null;
  private readonly trackListeners: TrackListener[] = [];
  private readonly media: MediaStreamProvider;
  private readonly videoFactory: VideoElementFactory;
  private readonly connectTimeoutMs: number;
  private readonly captureDeps: FrameCaptureDeps;
  private endedNotified = false;

  constructor(deps: StreamManagerDeps = {}) {
    this.media = deps.media ?? browserMediaStreamProvider;
    this.videoFactory = deps.videoFactory ?? domVideoElementFactory;
    this.connectTimeoutMs = deps.connectTimeoutMs ?? CAPTURE_CONNECT_TIMEOUT_MS;
    this.captureDeps = deps.captureDeps ?? {};
  }

  isActive(): boolean {
    return this.stream !== null;
  }

  async connect(streamId: string, onEnded: () => void): Promise<StreamConnection> {
    if (this.stream) {
      throw new CaptureError('stream-active', 'A MediaStream is already connected.');
    }
    if (!streamId) {
      throw new CaptureError('source-unavailable', 'The selected stream id is empty.');
    }

    let stream: MediaStream;
    try {
      const videoConstraints: ChromeDesktopTrackConstraints = {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId,
          maxFrameRate: 30,
        },
      };
      stream = await this.media.getUserMedia({
        audio: false,
        video: videoConstraints as unknown as MediaTrackConstraints,
      });
    } catch (error) {
      throw classifyMediaError(error);
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      stream.getTracks().forEach((track) => track.stop());
      throw new CaptureError('no-video-track', 'getUserMedia returned no video track.');
    }

    this.stream = stream;
    this.endedNotified = false;

    const listener = () => {
      if (!this.stream || this.endedNotified) return;
      this.endedNotified = true;
      try {
        onEnded();
      } finally {
        this.stop();
      }
    };
    videoTrack.addEventListener('ended', listener);
    this.trackListeners.push({ track: videoTrack, listener });

    const video = this.videoFactory.create();
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = stream;
    this.video = video;

    try {
      if (video.readyState < 2 || video.videoWidth <= 0) {
        await waitForVideoEvent(
          video,
          'loadedmetadata',
          this.connectTimeoutMs,
          'waiting for desktop video metadata',
        );
      }
      await video.play();
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        await waitForVideoEvent(
          video,
          'resize',
          Math.min(this.connectTimeoutMs, 5_000),
          'waiting for desktop video dimensions',
        );
      }
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        throw new CaptureError('connect-failed', 'Desktop video has zero dimensions.');
      }
    } catch (error) {
      this.stop();
      throw error instanceof CaptureError ? error : classifyMediaError(error);
    }

    let settings: MediaTrackSettings = {};
    try {
      settings = videoTrack.getSettings();
    } catch {
      // Settings are optional; the source label falls back to a generic label.
    }
    const surface = detectCaptureSurface(settings);

    return {
      surface,
      label: surfaceLabel(surface),
      width: video.videoWidth,
      height: video.videoHeight,
    };
  }

  async capture(deps: FrameCaptureDeps = this.captureDeps ?? {}): Promise<CapturedFrame> {
    const video = this.video;
    if (!video) {
      throw new CaptureError('video-not-ready', 'No desktop video is connected.');
    }
    const element = video as unknown as HTMLVideoElement;
    if (element.readyState < 2 || element.videoWidth <= 0 || element.videoHeight <= 0) {
      await this.waitForCaptureReady(element);
    }
    if (element.readyState < 2 || element.videoWidth <= 0 || element.videoHeight <= 0) {
      throw new CaptureError(
        'video-not-ready',
        `Desktop video was not ready for capture (readyState=${element.readyState}, ${element.videoWidth}x${element.videoHeight}).`,
      );
    }
    return captureFrameFromVideo(element, {}, deps);
  }

  private async waitForCaptureReady(element: CaptureVideoElement): Promise<void> {
    if (element.readyState < 2) {
      await waitForVideoEvent(
        element,
        'loadedmetadata',
        this.connectTimeoutMs,
        'waiting for desktop video metadata during capture',
      );
    }
    if (element.videoWidth <= 0 || element.videoHeight <= 0) {
      await waitForVideoEvent(
        element,
        'resize',
        Math.min(this.connectTimeoutMs, 5_000),
        'waiting for desktop video dimensions during capture',
      );
    }
  }

  stop(): void {
    for (const { track, listener } of this.trackListeners) {
      try {
        track.removeEventListener('ended', listener);
      } catch {
        // Track may already be gone.
      }
    }
    this.trackListeners.length = 0;

    const stream = this.stream;
    this.stream = null;
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Stopping an already-ended track is harmless.
        }
      }
    }

    const video = this.video;
    this.video = null;
    if (video) {
      try {
        video.pause();
      } catch {
        // Ignore pause failures on an ended element.
      }
      video.srcObject = null;
    }
  }
}
