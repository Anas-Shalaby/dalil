import { DEFAULT_GUIDE_TITLE } from '../shared/constants';
import { createId } from '../shared/format';
import { getGuide, persistGuide } from '../shared/guideService';
import { deleteScreenshot, putScreenshot } from '../shared/screenshotDb';
import type { CaptureSurface, Guide, GuideStep } from '../shared/types';
import { CaptureError, classifyStorageError } from './errors';

export interface CapturedStepInput {
  dataUrl: string;
  surface: CaptureSurface;
}

export interface CaptureGuideStore {
  load(guideId: string): Promise<Guide | null>;
  create(guideId?: string): Promise<Guide>;
  save(guide: Guide): Promise<Guide>;
  addStep(guide: Guide, input: CapturedStepInput): Promise<{ guide: Guide; step: GuideStep }>;
  removeStep(guide: Guide, stepId: string): Promise<Guide>;
}

export function createDraftCaptureGuide(id = createId()): Guide {
  const now = new Date().toISOString();
  return {
    id,
    title: DEFAULT_GUIDE_TITLE,
    description: '',
    createdAt: now,
    updatedAt: now,
    steps: [],
    source: 'desktop',
  };
}

export function buildCaptureStep(
  surface: CaptureSurface,
  screenshotId: string,
  createdAt = new Date().toISOString(),
): GuideStep {
  return {
    id: createId(),
    order: 0,
    actionType: 'manual',
    instruction: '',
    elementLabel: '',
    screenshotId,
    screenshotState: 'captured',
    captureSource: surface,
    createdAt,
  };
}

export class ChromeCaptureGuideStore implements CaptureGuideStore {
  async load(guideId: string): Promise<Guide | null> {
    try {
      return await getGuide(guideId);
    } catch (error) {
      throw classifyStorageError(error);
    }
  }

  async create(guideId?: string): Promise<Guide> {
    try {
      return await persistGuide(createDraftCaptureGuide(guideId));
    } catch (error) {
      throw classifyStorageError(error);
    }
  }

  async save(guide: Guide): Promise<Guide> {
    try {
      return await persistGuide(guide);
    } catch (error) {
      throw classifyStorageError(error);
    }
  }

  async addStep(
    guide: Guide,
    input: CapturedStepInput,
  ): Promise<{ guide: Guide; step: GuideStep }> {
    if (!input.dataUrl.startsWith('data:image/')) {
      throw new CaptureError('frame-failed', 'Refusing to store a non-image captured frame.');
    }

    const screenshotId = createId();
    const step = buildCaptureStep(input.surface, screenshotId);
    const next: Guide = {
      ...guide,
      updatedAt: new Date().toISOString(),
      steps: [...guide.steps, step].map((item, index) => ({ ...item, order: index + 1 })),
    };

    try {
      await putScreenshot({
        id: screenshotId,
        guideId: guide.id,
        stepId: step.id,
        dataUrl: input.dataUrl,
        createdAt: new Date().toISOString(),
      });
      const saved = await persistGuide(next);
      const savedStep = saved.steps.find((item) => item.id === step.id) ?? step;
      return { guide: saved, step: savedStep };
    } catch (error) {
      // Do not leave an orphan image if saving the guide metadata failed.
      try {
        await deleteScreenshot(screenshotId);
      } catch {
        // Best effort only.
      }
      throw classifyStorageError(error);
    }
  }

  async removeStep(guide: Guide, stepId: string): Promise<Guide> {
    const target = guide.steps.find((step) => step.id === stepId);
    if (!target) return guide;

    if (target.screenshotId) {
      try {
        await deleteScreenshot(target.screenshotId);
      } catch {
        // Metadata removal is what matters; an orphan image is harmless.
      }
    }

    try {
      return await persistGuide({
        ...guide,
        steps: guide.steps
          .filter((step) => step.id !== stepId)
          .map((step, index) => ({ ...step, order: index + 1 })),
      });
    } catch (error) {
      throw classifyStorageError(error);
    }
  }
}
