export type ActionType = 'click' | 'input' | 'select' | 'toggle' | 'manual';

export type GuideSource = 'browser' | 'desktop';

export type CaptureSurface = 'window' | 'screen' | 'tab' | 'unknown';

export type CaptureStatus =
  | 'idle'
  | 'selecting-source'
  | 'connecting'
  | 'recording'
  | 'capturing'
  | 'stopping'
  | 'completed'
  | 'error';

export type ScreenshotState =
  | 'captured'
  | 'capturing'
  | 'unavailable'
  | 'removed'
  | 'none';

export type AnnotationType = 'arrow' | 'rect' | 'ellipse' | 'text' | 'marker';

export interface AnnotationBase {
  id: string;
  type: AnnotationType;
  color: string;
  strokeWidth: number;
}

export interface ArrowAnnotation extends AnnotationBase {
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectAnnotation extends AnnotationBase {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EllipseAnnotation extends AnnotationBase {
  type: 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextAnnotation extends AnnotationBase {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export interface MarkerAnnotation extends AnnotationBase {
  type: 'marker';
  x: number;
  y: number;
}

export type Annotation =
  | ArrowAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | TextAnnotation
  | MarkerAnnotation;

export interface GuideStep {
  id: string;
  order: number;
  actionType: ActionType;
  instruction: string;
  elementLabel: string;
  screenshotId: string | null;
  screenshotState: ScreenshotState;
  screenshotNote?: string;
  annotations?: Annotation[];
  captureSource?: CaptureSurface;
  createdAt: string;
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  steps: GuideStep[];
  source?: GuideSource;
}

export interface CaptureSessionRecord {
  id: string;
  guideId: string;
  tabId: number | null;
  status: CaptureStatus;
  startedAt: string;
  updatedAt: string;
  stepCount: number;
}

export type RecordingStatus = 'recording' | 'paused';

export interface RecordingSession {
  guideId: string;
  tabId: number;
  windowId: number;
  tabTitle: string;
  siteHost: string;
  status: RecordingStatus;
  startedAt: string;
  updatedAt: string;
  stepCount: number;
  lastScreenshotError?: string;
}

export interface RecordingNotice {
  kind: 'info' | 'warning' | 'error';
  message: string;
  guideId?: string;
  createdAt: string;
}

export type ElementKind =
  | 'button'
  | 'link'
  | 'tab'
  | 'menuitem'
  | 'checkbox'
  | 'radio'
  | 'input'
  | 'select'
  | 'textarea'
  | 'control';

export interface CapturedAction {
  actionType: ActionType;
  elementKind: ElementKind;
  elementLabel: string;
  instruction: string;
  sensitive: boolean;
  allowScreenshot: boolean;
  screenshotNote?: string;
}

export interface StoredScreenshot {
  id: string;
  guideId: string;
  stepId: string;
  dataUrl: string;
  createdAt: string;
}

export interface ActiveTabInfo {
  id: number;
  title: string;
  url: string;
  host: string | null;
  supported: boolean;
  unsupportedReason?: string;
}
