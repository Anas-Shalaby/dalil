import { createId } from './format';
import type { Annotation, AnnotationType, TextAnnotation } from './types';

export const DEFAULT_ANNOTATION_COLOR = '#7440E9';
export const DEFAULT_STROKE_WIDTH = 0.0045;
export const DEFAULT_TEXT_SIZE = 0.0165;
export const MAX_ANNOTATIONS = 250;
export const MAX_TEXT_LENGTH = 200;

export const ANNOTATION_COLORS = [
  { label: 'بنفسجي', value: '#7440E9' },
  { label: 'أحمر', value: '#D92D45' },
  { label: 'أزرق', value: '#2563EB' },
  { label: 'رمادي داكن', value: '#2B2A3D' },
] as const;

export const STROKE_PRESETS = [
  { label: 'رفيع', value: 0.0026 },
  { label: 'متوسط', value: 0.0045 },
  { label: 'سميك', value: 0.0075 },
] as const;

const FONT_STACK =
  '"IBM Plex Sans Arabic", "SF Arabic", "Segoe UI", Tahoma, Arial, sans-serif';
const TEXT_MAX_WIDTH_RATIO = 0.42;
const TEXT_MAX_LINES = 8;

export interface AnnotationBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextLayout extends AnnotationBounds {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  padding: number;
  rtl: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function finite(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseColor(value: unknown): string {
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return DEFAULT_ANNOTATION_COLOR;
}

function normaliseStroke(value: unknown): number {
  return clamp(finite(value, DEFAULT_STROKE_WIDTH), 0.0008, 0.02);
}

function isArabicText(value: string): boolean {
  return /[\u0591-\u07ff\ufb1d-\ufdfd\ufe70-\ufefc]/.test(value);
}

export function isRtlText(value: string): boolean {
  return isArabicText(value);
}

export function markerNumber(annotations: Annotation[], id: string): number {
  const markers = annotations.filter((item) => item.type === 'marker');
  return markers.findIndex((item) => item.id === id) + 1;
}

export function sanitizeAnnotations(value: unknown): Annotation[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<string>();
  const result: Annotation[] = [];

  for (const entry of value) {
    if (result.length >= MAX_ANNOTATIONS) break;
    if (typeof entry !== 'object' || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    const type = raw.type as AnnotationType;
    if (!['arrow', 'rect', 'ellipse', 'text', 'marker'].includes(type)) continue;

    let id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id || usedIds.has(id)) id = createId();
    usedIds.add(id);

    const base = {
      id,
      color: normaliseColor(raw.color),
      strokeWidth: normaliseStroke(raw.strokeWidth),
    };

    if (type === 'arrow') {
      result.push({
        ...base,
        type,
        x1: clamp01(finite(raw.x1, 0.2)),
        y1: clamp01(finite(raw.y1, 0.2)),
        x2: clamp01(finite(raw.x2, 0.6)),
        y2: clamp01(finite(raw.y2, 0.6)),
      });
      continue;
    }

    if (type === 'rect' || type === 'ellipse') {
      const x = clamp01(finite(raw.x, 0.2));
      const y = clamp01(finite(raw.y, 0.2));
      const w = clamp(finite(raw.w, 0.3), 0.005, 1 - x);
      const h = clamp(finite(raw.h, 0.3), 0.005, 1 - y);
      result.push({ ...base, type, x, y, w, h });
      continue;
    }

    const x = clamp01(finite(raw.x, 0.5));
    const y = clamp01(finite(raw.y, 0.5));

    if (type === 'marker') {
      result.push({ ...base, type, x, y });
      continue;
    }

    const text =
      typeof raw.text === 'string' ? raw.text.replace(/\r\n/g, '\n').slice(0, MAX_TEXT_LENGTH).trim() : '';
    if (!text) continue;
    result.push({
      ...base,
      type: 'text',
      x,
      y,
      text,
      fontSize: clamp(finite(raw.fontSize, DEFAULT_TEXT_SIZE), 0.008, 0.05),
    });
  }

  return result;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || context.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length > TEXT_MAX_LINES) break;
  }

  return lines.slice(0, TEXT_MAX_LINES);
}

export function getTextLayout(
  context: CanvasRenderingContext2D,
  annotation: TextAnnotation,
  width: number,
  height: number,
): TextLayout {
  const fontSize = Math.max(8, annotation.fontSize * width);
  context.font = `600 ${fontSize}px ${FONT_STACK}`;
  const maxWidth = Math.max(width * 0.2, width * TEXT_MAX_WIDTH_RATIO);
  const lines = wrapText(context, annotation.text, maxWidth);
  const padding = Math.max(5, fontSize * 0.45);
  const lineHeight = fontSize * 1.5;
  const measured = Math.max(
    fontSize * 0.5,
    ...lines.map((line) => context.measureText(line || ' ').width),
  );
  const boxWidth = Math.min(maxWidth, measured) + padding * 2;
  const boxHeight = Math.max(lineHeight, lines.length * lineHeight) + padding * 2;
  const x = clamp(annotation.x * width, 0, Math.max(0, width - boxWidth));
  const y = clamp(annotation.y * height, 0, Math.max(0, height - boxHeight));

  return {
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    lines,
    fontSize,
    lineHeight,
    padding,
    rtl: isRtlText(annotation.text),
  };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

export function drawArrow(
  context: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'arrow' }>,
  width: number,
  height: number,
) {
  const x1 = annotation.x1 * width;
  const y1 = annotation.y1 * height;
  const x2 = annotation.x2 * width;
  const y2 = annotation.y2 * height;
  const lineWidth = Math.max(1, annotation.strokeWidth * width);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = Math.max(lineWidth * 4.2, width * 0.012);

  context.save();
  context.strokeStyle = annotation.color;
  context.fillStyle = annotation.color;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(
    x2 - Math.cos(angle) * headLength * 0.82,
    y2 - Math.sin(angle) * headLength * 0.82,
  );
  context.stroke();

  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(
    x2 - Math.cos(angle - Math.PI / 7) * headLength,
    y2 - Math.sin(angle - Math.PI / 7) * headLength,
  );
  context.lineTo(
    x2 - Math.cos(angle + Math.PI / 7) * headLength,
    y2 - Math.sin(angle + Math.PI / 7) * headLength,
  );
  context.closePath();
  context.fill();
  context.restore();
}

export function drawRect(
  context: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'rect' }>,
  width: number,
  height: number,
) {
  context.save();
  context.strokeStyle = annotation.color;
  context.lineWidth = Math.max(1, annotation.strokeWidth * width);
  context.lineJoin = 'round';
  context.strokeRect(
    annotation.x * width,
    annotation.y * height,
    Math.max(1, annotation.w * width),
    Math.max(1, annotation.h * height),
  );
  context.restore();
}

export function drawEllipse(
  context: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'ellipse' }>,
  width: number,
  height: number,
) {
  const rx = Math.max(1, (annotation.w * width) / 2);
  const ry = Math.max(1, (annotation.h * height) / 2);
  const cx = annotation.x * width + rx;
  const cy = annotation.y * height + ry;

  context.save();
  context.strokeStyle = annotation.color;
  context.lineWidth = Math.max(1, annotation.strokeWidth * width);
  context.beginPath();
  context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

export function drawText(
  context: CanvasRenderingContext2D,
  annotation: TextAnnotation,
  width: number,
  height: number,
) {
  const layout = getTextLayout(context, annotation, width, height);
  const borderWidth = Math.max(1, annotation.strokeWidth * width * 0.45);

  context.save();
  context.shadowColor = 'rgba(25, 24, 39, 0.16)';
  context.shadowBlur = Math.max(4, width * 0.004);
  context.shadowOffsetY = Math.max(1, width * 0.0015);
  roundedRect(
    context,
    layout.x,
    layout.y,
    layout.width,
    layout.height,
    Math.max(6, layout.fontSize * 0.35),
  );
  context.fillStyle = 'rgba(255, 255, 255, 0.96)';
  context.fill();
  context.shadowColor = 'transparent';
  context.lineWidth = borderWidth;
  context.strokeStyle = annotation.color;
  context.stroke();

  context.fillStyle = annotation.color;
  context.font = `600 ${layout.fontSize}px ${FONT_STACK}`;
  context.textBaseline = 'middle';
  context.direction = layout.rtl ? 'rtl' : 'ltr';
  context.textAlign = layout.rtl ? 'right' : 'left';
  const textX = layout.rtl
    ? layout.x + layout.width - layout.padding
    : layout.x + layout.padding;

  layout.lines.forEach((line, index) => {
    const textY =
      layout.y + layout.padding + layout.lineHeight * index + layout.lineHeight / 2;
    context.fillText(line, textX, textY);
  });

  context.restore();
}

export function drawMarker(
  context: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'marker' }>,
  annotations: Annotation[],
  width: number,
  height: number,
) {
  const radius = Math.max(8, Math.min(width, height) * 0.021);
  const cx = annotation.x * width;
  const cy = annotation.y * height;
  const order = markerNumber(annotations, annotation.id);

  context.save();
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fillStyle = annotation.color;
  context.fill();
  context.lineWidth = Math.max(2, width * 0.0025);
  context.strokeStyle = 'rgba(255, 255, 255, 0.96)';
  context.stroke();

  context.fillStyle = '#FFFFFF';
  context.font = `700 ${radius * 1.15}px ${FONT_STACK}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.direction = 'ltr';
  context.fillText(String(Math.max(1, order)), cx, cy + radius * 0.04);
  context.restore();
}

export function drawAnnotations(
  context: CanvasRenderingContext2D,
  annotations: Annotation[],
  width: number,
  height: number,
) {
  if (annotations.length === 0 || width <= 0 || height <= 0) return;

  for (const annotation of annotations) {
    switch (annotation.type) {
      case 'arrow':
        drawArrow(context, annotation, width, height);
        break;
      case 'rect':
        drawRect(context, annotation, width, height);
        break;
      case 'ellipse':
        drawEllipse(context, annotation, width, height);
        break;
      case 'text':
        drawText(context, annotation, width, height);
        break;
      case 'marker':
        drawMarker(context, annotation, annotations, width, height);
        break;
    }
  }
}

export function getAnnotationBounds(
  context: CanvasRenderingContext2D,
  annotation: Annotation,
  width: number,
  height: number,
): AnnotationBounds {
  switch (annotation.type) {
    case 'arrow': {
      const x = Math.min(annotation.x1, annotation.x2) * width;
      const y = Math.min(annotation.y1, annotation.y2) * height;
      return {
        x,
        y,
        width: Math.abs(annotation.x2 - annotation.x1) * width,
        height: Math.abs(annotation.y2 - annotation.y1) * height,
      };
    }
    case 'rect':
    case 'ellipse':
      return {
        x: annotation.x * width,
        y: annotation.y * height,
        width: annotation.w * width,
        height: annotation.h * height,
      };
    case 'text': {
      const layout = getTextLayout(context, annotation, width, height);
      return { x: layout.x, y: layout.y, width: layout.width, height: layout.height };
    }
    case 'marker': {
      const radius = Math.max(8, Math.min(width, height) * 0.021);
      return {
        x: annotation.x * width - radius,
        y: annotation.y * height - radius,
        width: radius * 2,
        height: radius * 2,
      };
    }
  }
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSquared, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function hitTestAnnotation(
  context: CanvasRenderingContext2D,
  annotation: Annotation,
  x: number,
  y: number,
  width: number,
  height: number,
  tolerance: number,
): boolean {
  const bounds = getAnnotationBounds(context, annotation, width, height);
  const lineWidth = Math.max(1, annotation.strokeWidth * width);

  switch (annotation.type) {
    case 'marker': {
      const cx = annotation.x * width;
      const cy = annotation.y * height;
      const radius = Math.max(8, Math.min(width, height) * 0.021) + tolerance;
      return Math.hypot(x - cx, y - cy) <= radius;
    }
    case 'text':
      return (
        x >= bounds.x - tolerance &&
        x <= bounds.x + bounds.width + tolerance &&
        y >= bounds.y - tolerance &&
        y <= bounds.y + bounds.height + tolerance
      );
    case 'arrow': {
      const x1 = annotation.x1 * width;
      const y1 = annotation.y1 * height;
      const x2 = annotation.x2 * width;
      const y2 = annotation.y2 * height;
      return (
        distanceToSegment(x, y, x1, y1, x2, y2) <= Math.max(tolerance, lineWidth) ||
        Math.hypot(x - x2, y - y2) <= Math.max(tolerance, lineWidth * 2)
      );
    }
    case 'rect':
      return (
        x >= bounds.x - tolerance &&
        x <= bounds.x + bounds.width + tolerance &&
        y >= bounds.y - tolerance &&
        y <= bounds.y + bounds.height + tolerance
      );
    case 'ellipse': {
      const rx = Math.max(1, bounds.width / 2) + tolerance;
      const ry = Math.max(1, bounds.height / 2) + tolerance;
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    }
  }
}
