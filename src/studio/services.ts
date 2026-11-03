import { getGuide } from '../shared/guideService';
import type { Guide } from '../shared/types';
import {
  exportDocumentToPdf,
  type ExportDocumentInput,
  type ExportProgress,
} from '../pdf/exportPdf';
import { loadGuideAssets, type GuideAssets } from '../pdf/guideAssets';
import {
  deletePdfPreset,
  loadPdfDesign,
  loadPdfPresets,
  savePdfDesign,
  savePdfPreset,
  updatePdfPreset,
} from '../pdf/presets';
import type { PdfDesignSettings, PdfPreset } from '../pdf/types';

export type { ExportProgress };

export interface PdfStudioServices {
  loadGuide(guideId: string): Promise<Guide | null>;
  loadAssets(guide: Guide): Promise<GuideAssets>;
  loadDesign(guideId: string): Promise<PdfDesignSettings | null>;
  saveDesign(guideId: string, settings: PdfDesignSettings): Promise<void>;
  loadPresets(): Promise<PdfPreset[]>;
  createPreset(name: string, settings: PdfDesignSettings): Promise<PdfPreset>;
  updatePreset(
    presetId: string,
    name: string,
    settings: PdfDesignSettings,
  ): Promise<PdfPreset | null>;
  removePreset(presetId: string): Promise<void>;
  exportPdf(input: ExportDocumentInput): Promise<Blob>;
  print(): void;
}

export function createChromePdfStudioServices(): PdfStudioServices {
  return {
    loadGuide: getGuide,
    loadAssets: loadGuideAssets,
    loadDesign: loadPdfDesign,
    saveDesign: savePdfDesign,
    loadPresets: loadPdfPresets,
    createPreset: savePdfPreset,
    updatePreset: updatePdfPreset,
    removePreset: deletePdfPreset,
    exportPdf: exportDocumentToPdf,
    print: () => window.print(),
  };
}
