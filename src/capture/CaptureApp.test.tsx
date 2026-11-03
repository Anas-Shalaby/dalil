import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CaptureApp } from './CaptureApp';
import { CaptureError } from './errors';
import { ChromeCaptureGuideStore } from './guideStore';
import type { CaptureServices } from './services';
import type { CaptureLock } from './sessionLock';
import type { DesktopSourcePicker } from './desktopCapture';
import type { CaptureSessionRecord } from '../shared/types';

const dataUrl = 'data:image/jpeg;base64,ZnJhbWU=';

function createServices(overrides: Partial<CaptureServices> = {}) {
  const record: CaptureSessionRecord = {
    id: 'session-1',
    guideId: 'guide',
    tabId: 1,
    status: 'recording',
    startedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    stepCount: 0,
  };

  const picker: DesktopSourcePicker = {
    choose: vi.fn(async () => ({ streamId: 'stream-1', canRequestAudioTrack: false })),
    cancel: vi.fn(),
    isPending: vi.fn(() => false),
  };

  const streams = {
    connect: vi.fn(async () => ({
      surface: 'window' as const,
      label: 'نافذة محددة',
      width: 1280,
      height: 720,
    })),
    capture: vi.fn(async () => ({
      dataUrl,
      width: 1280,
      height: 720,
      bytes: 100,
      type: 'image/jpeg',
    })),
    stop: vi.fn(),
    isActive: vi.fn(() => true),
  };

  const lock: CaptureLock = {
    acquire: vi.fn(async () => ({ ok: true as const, record, selfTabId: 1 })),
    touch: vi.fn(async () => undefined),
    release: vi.fn(async () => undefined),
  };

  const services: CaptureServices = {
    picker,
    streams: streams as unknown as CaptureServices['streams'],
    guides: new ChromeCaptureGuideStore(),
    lock,
    openEditor: vi.fn(async () => undefined),
    openPrint: vi.fn(async () => undefined),
    openLibrary: vi.fn(async () => undefined),
    focusTab: vi.fn(async () => undefined),
    logError: vi.fn(),
    ...overrides,
  };

  return { services, picker, streams, lock };
}

describe('CaptureApp session flow', () => {
  it('starts idle and explains window-first capture', async () => {
    const { services } = createServices();
    render(<CaptureApp services={services} initialGuideId={null} />);

    expect(
      await screen.findByRole('heading', { name: /اختر نافذة البرنامج/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ننصح باختيار/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /اختيار نافذة أو شاشة/ })).toBeEnabled();
  });

  it('selects a source, captures a step, and finishes into the editor', async () => {
    const user = userEvent.setup();
    const { services, picker, streams, lock } = createServices();
    render(<CaptureApp services={services} initialGuideId={null} />);

    await user.click(await screen.findByRole('button', { name: /اختيار نافذة أو شاشة/ }));

    expect(await screen.findByText(/الالتقاط جاهز/)).toBeInTheDocument();
    expect(picker.choose).toHaveBeenCalledTimes(1);
    expect(streams.connect).toHaveBeenCalledWith('stream-1', expect.any(Function));

    await user.click(screen.getByRole('button', { name: /التقاط خطوة/ }));

    expect(await screen.findByPlaceholderText(/اكتب ماذا فعلت/)).toBeInTheDocument();
    expect(streams.capture).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/تم توثيق 1/)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /إنهاء التوثيق وفتح المحرر/ }),
    );

    await waitFor(() => expect(services.openEditor).toHaveBeenCalledTimes(1));
    expect(services.openEditor).toHaveBeenCalledWith(expect.any(String));
    expect(lock.release).toHaveBeenCalledWith('session-1');
    expect(streams.stop).toHaveBeenCalled();

    const guideId = (services.openEditor as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const saved = await services.guides.load(guideId);
    expect(saved?.steps).toHaveLength(1);
    expect(saved?.steps[0].captureSource).toBe('window');
  });

  it('shows the conflict state when another session owns the lock', async () => {
    const lock: CaptureLock = {
      acquire: vi.fn(async () => ({ ok: false as const, conflictTabId: 9 })),
      touch: vi.fn(async () => undefined),
      release: vi.fn(async () => undefined),
    };
    const { services } = createServices({ lock });
    render(<CaptureApp services={services} initialGuideId={null} />);

    expect(await screen.findByText(/جلسة التقاط أخرى مفتوحة/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /العودة إلى الجلسة الحالية/ }),
    ).toBeInTheDocument();

    await userEvent.setup().click(
      screen.getByRole('button', { name: /العودة إلى الجلسة الحالية/ }),
    );
    expect(services.focusTab).toHaveBeenCalledWith(9);
  });

  it('does not capture when the source connection fails', async () => {
    const user = userEvent.setup();
    const { services, streams } = createServices();
    streams.connect.mockRejectedValueOnce(
      new CaptureError('permission-denied', 'denied'),
    );
    render(<CaptureApp services={services} initialGuideId={null} />);

    await user.click(await screen.findByRole('button', { name: /اختيار نافذة أو شاشة/ }));

    expect(
      await screen.findByText(/لم يُمنح إذن الوصول إلى مصدر الالتقاط/),
    ).toBeInTheDocument();
    expect(streams.capture).not.toHaveBeenCalled();
  });

  it('saves edited guide metadata through the capture store', async () => {
    const user = userEvent.setup();
    const { services } = createServices();
    render(<CaptureApp services={services} initialGuideId={null} />);

    const title = await screen.findByLabelText(/اسم الدليل/);
    await user.clear(title);
    await user.type(title, 'دليل برنامج المخزون');
    await user.tab();

    await waitFor(async () => {
      const stored = await chrome.storage.local.get('dalil:guides:v1');
      expect(JSON.stringify(stored)).toContain('دليل برنامج المخزون');
    });
  });
});
