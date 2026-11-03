import { describe, expect, it } from 'vitest';
import { createId } from './format';
import { duplicateGuideWithoutScreenshots, persistGuide } from './guideService';
import type { Guide } from './types';

function desktopGuide(): Guide {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: 'دليل سطح المكتب',
    description: 'وصف',
    createdAt: now,
    updatedAt: now,
    source: 'desktop',
    steps: [
      {
        id: createId(),
        order: 1,
        actionType: 'manual',
        instruction: 'افتح البرنامج',
        elementLabel: '',
        screenshotId: 'shot-1',
        screenshotState: 'captured',
        captureSource: 'window',
        createdAt: now,
      },
    ],
  };
}

describe('guideService desktop compatibility', () => {
  it('normalizes step order without dropping capture source', async () => {
    const guide = desktopGuide();
    guide.steps = [
      { ...guide.steps[0], order: 99 },
      { ...guide.steps[0], id: createId(), order: 50 },
    ];

    const saved = await persistGuide(guide);
    expect(saved.steps.map((step) => step.order)).toEqual([1, 2]);
    expect(saved.steps.every((step) => step.captureSource === 'window')).toBe(true);
    expect(saved.source).toBe('desktop');
  });

  it('keeps legacy browser guides without new fields intact', async () => {
    const now = new Date().toISOString();
    const legacy: Guide = {
      id: createId(),
      title: 'دليل ويب',
      description: '',
      createdAt: now,
      updatedAt: now,
      steps: [
        {
          id: createId(),
          order: 1,
          actionType: 'click',
          instruction: 'اضغط',
          elementLabel: 'زر',
          screenshotId: null,
          screenshotState: 'none',
          createdAt: now,
        },
      ],
    };

    const saved = await persistGuide(legacy);
    expect(saved.source).toBeUndefined();
    expect(saved.steps[0].captureSource).toBeUndefined();
    expect(saved.steps[0].actionType).toBe('click');
  });

  it('preserves desktop source when duplicating without screenshots', async () => {
    const guide = await persistGuide(desktopGuide());
    const copy = await duplicateGuideWithoutScreenshots(guide.id);
    expect(copy?.source).toBe('desktop');
    expect(copy?.steps[0].captureSource).toBe('window');
    expect(copy?.steps[0].screenshotId).toBeNull();
  });
});
