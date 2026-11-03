import {
  DEFAULT_GUIDE_TITLE,
  MAX_DESCRIPTION_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_TITLE_LENGTH,
} from '../shared/constants';
import { createId } from './format';
import { deleteScreenshot, deleteScreenshotsForGuide, putScreenshot } from './screenshotDb';
import {
  deleteGuideRecord,
  loadGuide,
  loadGuides,
  saveGuide,
  saveGuides,
} from './storage';
import type { Guide, GuideStep } from './types';

export async function getGuides(): Promise<Guide[]> {
  return loadGuides();
}

export async function getGuide(id: string): Promise<Guide | null> {
  return loadGuide(id);
}

export async function persistGuide(guide: Guide): Promise<Guide> {
  const normalized: Guide = {
    ...guide,
    title: guide.title.trim().slice(0, MAX_TITLE_LENGTH) || DEFAULT_GUIDE_TITLE,
    description: guide.description.slice(0, MAX_DESCRIPTION_LENGTH),
    updatedAt: new Date().toISOString(),
    steps: guide.steps.map((step, index) => ({
      ...step,
      order: index + 1,
      elementLabel: step.elementLabel.slice(0, MAX_LABEL_LENGTH),
    })),
  };
  await saveGuide(normalized);
  return normalized;
}

export async function removeGuide(guideId: string): Promise<void> {
  await deleteGuideRecord(guideId);
  try {
    await deleteScreenshotsForGuide(guideId);
  } catch {
    // Metadata is already removed; orphaned screenshots stay harmless.
  }
}

export async function duplicateGuide(guideId: string): Promise<Guide | null> {
  const original = await loadGuide(guideId);
  if (!original) return null;

  const now = new Date().toISOString();
  const copy: Guide = {
    id: createId(),
    title: `${original.title} (نسخة)`.slice(0, MAX_TITLE_LENGTH),
    description: original.description,
    createdAt: now,
    updatedAt: now,
    steps: original.steps.map((step) => ({ ...step, id: createId() })),
    source: original.source,
  };

  await saveGuide(copy);
  return copy;
}

export async function duplicateGuideWithoutScreenshots(guideId: string): Promise<Guide | null> {
  const original = await loadGuide(guideId);
  if (!original) return null;

  const now = new Date().toISOString();
  const copy: Guide = {
    id: createId(),
    title: `${original.title} (نسخة)`.slice(0, MAX_TITLE_LENGTH),
    description: original.description,
    createdAt: now,
    updatedAt: now,
    steps: original.steps.map((step) => ({
      ...step,
      id: createId(),
      screenshotId: null,
      screenshotState: step.screenshotState === 'removed' ? 'removed' : 'none',
      annotations: undefined,
      screenshotNote:
        step.screenshotId || step.screenshotState === 'captured'
          ? 'لم تُنسخ اللقطة عند إنشاء النسخة.'
          : step.screenshotNote,
    })),
    source: original.source,
  };

  await saveGuide(copy);
  return copy;
}

export async function renameGuide(guideId: string, title: string): Promise<Guide | null> {
  const guide = await loadGuide(guideId);
  if (!guide) return null;

  const updated: Guide = {
    ...guide,
    title: title.trim().slice(0, MAX_TITLE_LENGTH) || DEFAULT_GUIDE_TITLE,
    updatedAt: new Date().toISOString(),
  };
  await saveGuide(updated);
  return updated;
}

export async function createGuideWithStep(guide: Guide, step: GuideStep): Promise<Guide> {
  const now = new Date().toISOString();
  const next: Guide = {
    ...guide,
    createdAt: guide.createdAt || now,
    updatedAt: now,
    steps: [...guide.steps, step].map((item, index) => ({ ...item, order: index + 1 })),
  };
  await saveGuide(next);
  return next;
}

export async function attachScreenshot(
  guideId: string,
  stepId: string,
  dataUrl: string,
): Promise<Guide | null> {
  const guide = await loadGuide(guideId);
  if (!guide) return null;

  const screenshotId = createId();
  await putScreenshot({
    id: screenshotId,
    guideId,
    stepId,
    dataUrl,
    createdAt: new Date().toISOString(),
  });

  const steps = guide.steps.map((step) => {
    if (step.id !== stepId) return step;
    return {
      ...step,
      screenshotId,
      screenshotState: 'captured' as const,
      screenshotNote: undefined,
      annotations: undefined,
    };
  });

  return persistGuide({ ...guide, steps });
}

export async function detachScreenshot(
  guideId: string,
  stepId: string,
): Promise<Guide | null> {
  const guide = await loadGuide(guideId);
  if (!guide) return null;

  const target = guide.steps.find((step) => step.id === stepId);
  if (target?.screenshotId) {
    try {
      await deleteScreenshot(target.screenshotId);
    } catch {
      // Ignore missing screenshot records.
    }
  }

  const steps = guide.steps.map((step) => {
    if (step.id !== stepId) return step;
    return {
      ...step,
      screenshotId: null,
      screenshotState: 'removed' as const,
      annotations: undefined,
      screenshotNote:
        step.screenshotNote ?? 'أُزيلت اللقطة من هذا الدليل. يمكنك إضافة لقطة جديدة.',
    };
  });

  return persistGuide({ ...guide, steps });
}

export async function replaceScreenshotsForGuide(
  guideId: string,
  dataUrls: Map<string, string>,
): Promise<void> {
  await deleteScreenshotsForGuide(guideId);
  const now = new Date().toISOString();
  for (const [stepId, dataUrl] of dataUrls) {
    await putScreenshot({
      id: createId(),
      guideId,
      stepId,
      dataUrl,
      createdAt: now,
    });
  }
}

export function buildManualStep(): GuideStep {
  return {
    id: createId(),
    order: 0,
    actionType: 'manual',
    instruction: '',
    elementLabel: '',
    screenshotId: null,
    screenshotState: 'none',
    createdAt: new Date().toISOString(),
  };
}

export async function reindexGuides(): Promise<void> {
  const guides = await loadGuides();
  await saveGuides(guides);
}
