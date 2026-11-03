import { describe, expect, it } from 'vitest';
import { getScreenshot } from '../shared/screenshotDb';
import { ChromeCaptureGuideStore } from './guideStore';

const dataUrl = 'data:image/jpeg;base64,ZnJhbWU=';

describe('ChromeCaptureGuideStore', () => {
  it('creates a desktop guide that survives a reload', async () => {
    const store = new ChromeCaptureGuideStore();
    const created = await store.create();
    expect(created.source).toBe('desktop');
    expect(created.steps).toHaveLength(0);

    const loaded = await store.load(created.id);
    expect(loaded?.id).toBe(created.id);
    expect(loaded?.source).toBe('desktop');
  });

  it('persists a captured frame as a normal guide step and screenshot', async () => {
    const store = new ChromeCaptureGuideStore();
    const guide = await store.create();

    const { guide: updated, step } = await store.addStep(guide, {
      dataUrl,
      surface: 'window',
    });

    expect(updated.steps).toHaveLength(1);
    expect(step.order).toBe(1);
    expect(step.actionType).toBe('manual');
    expect(step.captureSource).toBe('window');
    expect(step.screenshotState).toBe('captured');
    expect(step.screenshotId).toBeTruthy();

    const screenshot = await getScreenshot(step.screenshotId!);
    expect(screenshot?.dataUrl).toBe(dataUrl);
    expect(screenshot?.guideId).toBe(guide.id);

    const reloaded = await store.load(guide.id);
    expect(reloaded?.steps[0].captureSource).toBe('window');
  });

  it('keeps step order contiguous when removing a step', async () => {
    const store = new ChromeCaptureGuideStore();
    let guide = await store.create();
    guide = (await store.addStep(guide, { dataUrl, surface: 'window' })).guide;
    const second = await store.addStep(guide, { dataUrl, surface: 'screen' });
    guide = second.guide;

    const next = await store.removeStep(guide, second.step.id);
    expect(next.steps).toHaveLength(1);
    expect(next.steps[0].order).toBe(1);
    await expect(getScreenshot(second.step.screenshotId!)).resolves.toBeNull();
  });

  it('deletes the screenshot when its guide step is removed', async () => {
    const store = new ChromeCaptureGuideStore();
    const guide = await store.create();
    const { guide: updated, step } = await store.addStep(guide, {
      dataUrl,
      surface: 'screen',
    });

    await store.removeStep(updated, step.id);
    await expect(getScreenshot(step.screenshotId!)).resolves.toBeNull();
  });

  it('refuses to store a non-image frame', async () => {
    const store = new ChromeCaptureGuideStore();
    const guide = await store.create();
    await expect(
      store.addStep(guide, { dataUrl: 'text/plain;base64,abc', surface: 'window' }),
    ).rejects.toMatchObject({ code: 'frame-failed' });
  });
});
