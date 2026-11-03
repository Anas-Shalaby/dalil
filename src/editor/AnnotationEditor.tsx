import {
  AlertTriangle,
  ArrowUpRight,
  Circle,
  Hash,
  ImageOff,
  Loader2,
  MousePointer2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  Redo2,
  PencilLine,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_TEXT_SIZE,
  MAX_TEXT_LENGTH,
  STROKE_PRESETS,
  drawAnnotations,
  getAnnotationBounds,
  hitTestAnnotation,
  markerNumber,
  sanitizeAnnotations,
} from '../shared/annotations';
import { Button } from '../shared/components/Button';
import { Dialog } from '../shared/components/Dialog';
import { IconButton } from '../shared/components/IconButton';
import { cn } from '../shared/cn';
import { createId } from '../shared/format';
import { getScreenshot } from '../shared/screenshotDb';
import type {
  Annotation,
  ArrowAnnotation,
  EllipseAnnotation,
  GuideStep,
  RectAnnotation,
  TextAnnotation,
} from '../shared/types';

type Tool = 'select' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'marker';
type ShapeTool = 'arrow' | 'rect' | 'ellipse';
type CornerHorizontal = 'min' | 'max';
type CornerVertical = 'min' | 'max';

interface Point {
  x: number;
  y: number;
  px: number;
  py: number;
}

interface ResizeHandle {
  horizontal: CornerHorizontal;
  vertical: CornerVertical;
  x: number;
  y: number;
}

interface ArrowHandle {
  endpoint: 'start' | 'end';
  x: number;
  y: number;
}

interface TextEditorState {
  id: string | null;
  x: number;
  y: number;
  value: string;
  initial: string;
}

type DragState =
  | {
      kind: 'draw';
      tool: ShapeTool;
      start: Point;
      before: Annotation[];
    }
  | {
      kind: 'move';
      id: string;
      start: Point;
      before: Annotation[];
      original: Annotation;
      moved?: boolean;
    }
  | {
      kind: 'resize';
      id: string;
      before: Annotation[];
      original: RectAnnotation | EllipseAnnotation;
      corner: ResizeHandle;
      moved?: boolean;
    }
  | {
      kind: 'endpoint';
      id: string;
      before: Annotation[];
      original: ArrowAnnotation;
      endpoint: 'start' | 'end';
      moved?: boolean;
    }
  | {
      kind: 'click';
      tool: 'text' | 'marker';
      start: Point;
      moved: boolean;
    };

interface AnnotationEditorProps {
  step: GuideStep;
  stepNumber: number;
  screenshotId: string;
  initialAnnotations: Annotation[];
  onClose: () => void;
  onSave: (annotations: Annotation[]) => Promise<void>;
}

const TOOLS: Array<{ id: Tool; label: string; icon: typeof MousePointer2 }> = [
  { id: 'select', label: 'تحديد', icon: MousePointer2 },
  { id: 'arrow', label: 'سهم', icon: ArrowUpRight },
  { id: 'rect', label: 'مستطيل', icon: Square },
  { id: 'ellipse', label: 'دائرة', icon: Circle },
  { id: 'text', label: 'نص', icon: Type },
  { id: 'marker', label: 'ترقيم', icon: Hash },
];

const HISTORY_LIMIT = 60;
const DISPLAY_ACCENT = '#7440E9';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function areEqual(a: Annotation[], b: Annotation[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildShape(
  tool: ShapeTool,
  start: Point,
  end: Point,
  color: string,
  strokeWidth: number,
): Annotation | null {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  if (tool === 'arrow') {
    if (Math.hypot(end.x - start.x, end.y - start.y) < 0.008) return null;
    return {
      id: createId(),
      type: 'arrow',
      color,
      strokeWidth,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
    };
  }

  if (w < 0.008 || h < 0.008) return null;
  return {
    id: createId(),
    type: tool,
    color,
    strokeWidth,
    x,
    y,
    w,
    h,
  };
}

function moveAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
  switch (annotation.type) {
    case 'arrow': {
      const minX = Math.min(annotation.x1, annotation.x2);
      const maxX = Math.max(annotation.x1, annotation.x2);
      const minY = Math.min(annotation.y1, annotation.y2);
      const maxY = Math.max(annotation.y1, annotation.y2);
      const safeDx = clamp(dx, -minX, 1 - maxX);
      const safeDy = clamp(dy, -minY, 1 - maxY);
      return {
        ...annotation,
        x1: annotation.x1 + safeDx,
        y1: annotation.y1 + safeDy,
        x2: annotation.x2 + safeDx,
        y2: annotation.y2 + safeDy,
      };
    }
    case 'rect':
    case 'ellipse': {
      const safeDx = clamp(dx, -annotation.x, 1 - (annotation.x + annotation.w));
      const safeDy = clamp(dy, -annotation.y, 1 - (annotation.y + annotation.h));
      return { ...annotation, x: annotation.x + safeDx, y: annotation.y + safeDy };
    }
    case 'text':
    case 'marker':
      return {
        ...annotation,
        x: clamp(annotation.x + dx, 0, 1),
        y: clamp(annotation.y + dy, 0, 1),
      };
  }
}

function resizeShape(
  original: RectAnnotation | EllipseAnnotation,
  corner: ResizeHandle,
  point: Point,
): RectAnnotation | EllipseAnnotation {
  const fixedX = corner.horizontal === 'min' ? original.x + original.w : original.x;
  const fixedY = corner.vertical === 'min' ? original.y + original.h : original.y;
  let left = Math.min(fixedX, point.x);
  let right = Math.max(fixedX, point.x);
  let top = Math.min(fixedY, point.y);
  let bottom = Math.max(fixedY, point.y);

  if (right - left < 0.008) {
    if (point.x <= fixedX) left = Math.max(0, right - 0.008);
    else right = Math.min(1, left + 0.008);
  }
  if (bottom - top < 0.008) {
    if (point.y <= fixedY) top = Math.max(0, bottom - 0.008);
    else bottom = Math.min(1, top + 0.008);
  }

  return { ...original, x: left, y: top, w: right - left, h: bottom - top };
}

function getHandles(
  context: CanvasRenderingContext2D,
  annotation: Annotation,
  width: number,
  height: number,
): ResizeHandle[] {
  if (annotation.type !== 'rect' && annotation.type !== 'ellipse') return [];
  const bounds = getAnnotationBounds(context, annotation, width, height);
  return [
    { horizontal: 'min', vertical: 'min', x: bounds.x, y: bounds.y },
    { horizontal: 'max', vertical: 'min', x: bounds.x + bounds.width, y: bounds.y },
    { horizontal: 'min', vertical: 'max', x: bounds.x, y: bounds.y + bounds.height },
    {
      horizontal: 'max',
      vertical: 'max',
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height,
    },
  ];
}

function getArrowHandles(
  annotation: ArrowAnnotation,
  width: number,
  height: number,
): ArrowHandle[] {
  return [
    { endpoint: 'start', x: annotation.x1 * width, y: annotation.y1 * height },
    { endpoint: 'end', x: annotation.x2 * width, y: annotation.y2 * height },
  ];
}

function findResizeHandle(
  context: CanvasRenderingContext2D,
  annotation: Annotation,
  x: number,
  y: number,
  width: number,
  height: number,
): ResizeHandle | null {
  const tolerance = 11;
  for (const handle of getHandles(context, annotation, width, height)) {
    if (Math.hypot(handle.x - x, handle.y - y) <= tolerance) return handle;
  }
  return null;
}

function findArrowHandle(
  annotation: ArrowAnnotation,
  x: number,
  y: number,
  width: number,
  height: number,
): ArrowHandle | null {
  const tolerance = 11;
  for (const handle of getArrowHandles(annotation, width, height)) {
    if (Math.hypot(handle.x - x, handle.y - y) <= tolerance) return handle;
  }
  return null;
}

function drawSelection(
  context: CanvasRenderingContext2D,
  annotation: Annotation,
  width: number,
  height: number,
) {
  const bounds = getAnnotationBounds(context, annotation, width, height);
  context.save();
  context.strokeStyle = DISPLAY_ACCENT;
  context.lineWidth = 1.5;
  context.setLineDash([5, 4]);

  if (annotation.type === 'marker') {
    const radius = Math.max(8, Math.min(width, height) * 0.021) + 7;
    context.beginPath();
    context.arc(annotation.x * width, annotation.y * height, radius, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
  }

  context.setLineDash([]);
  context.fillStyle = '#FFFFFF';
  context.strokeStyle = DISPLAY_ACCENT;
  context.lineWidth = 1.5;

  if (annotation.type === 'rect' || annotation.type === 'ellipse') {
    for (const handle of getHandles(context, annotation, width, height)) {
      context.fillRect(handle.x - 4, handle.y - 4, 8, 8);
      context.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
    }
  }

  if (annotation.type === 'arrow') {
    for (const handle of getArrowHandles(annotation, width, height)) {
      context.beginPath();
      context.arc(handle.x, handle.y, 5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  context.restore();
}

function wrapTextEditorValue(value: string): string {
  return value.replace(/\r\n/g, '\n').slice(0, MAX_TEXT_LENGTH);
}

export function AnnotationEditor({
  step,
  stepNumber,
  screenshotId,
  initialAnnotations,
  onClose,
  onSave,
}: AnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const measureRef = useRef<CanvasRenderingContext2D | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const draftRef = useRef<Annotation | null>(null);
  const initialRef = useRef<Annotation[]>(initialAnnotations);

  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [past, setPast] = useState<Annotation[][]>([]);
  const [future, setFuture] = useState<Annotation[][]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState(DEFAULT_ANNOTATION_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [hoverCursor, setHoverCursor] = useState('default');
  const [fontTick, setFontTick] = useState(0);

  const selected = useMemo(
    () => annotations.find((annotation) => annotation.id === selectedId) ?? null,
    [annotations, selectedId],
  );

  const dirty = useMemo(
    () => !areEqual(annotations, initialRef.current),
    [annotations],
  );
  const textDirty = textEditor ? textEditor.value !== textEditor.initial : false;
  const hasUnsavedChanges = dirty || textDirty;

  const display = useMemo(() => {
    if (natural.width <= 0 || natural.height <= 0 || available.width <= 0 || available.height <= 0) {
      return { width: 0, height: 0 };
    }
    const padding = 16;
    const scale = Math.min(
      (available.width - padding) / natural.width,
      (available.height - padding) / natural.height,
      1,
    );
    return {
      width: Math.max(1, Math.round(natural.width * Math.max(0.05, scale))),
      height: Math.max(1, Math.round(natural.height * Math.max(0.05, scale))),
    };
  }, [available, natural]);

  const getMeasureContext = useCallback((): CanvasRenderingContext2D | null => {
    if (!measureRef.current) {
      const canvas = document.createElement('canvas');
      measureRef.current = canvas.getContext('2d');
    }
    return measureRef.current;
  }, []);

  useEffect(() => {
    let active = true;
    setImageState('loading');
    getScreenshot(screenshotId)
      .then((record) => {
        if (!active) return;
        if (!record?.dataUrl) {
          setImageState('error');
          return;
        }
        const image = new Image();
        image.onload = () => {
          if (!active) return;
          if (image.naturalWidth === 0 || image.naturalHeight === 0) {
            setImageState('error');
            return;
          }
          imageRef.current = image;
          setNatural({ width: image.naturalWidth, height: image.naturalHeight });
          setImageState('ready');
        };
        image.onerror = () => {
          if (active) setImageState('error');
        };
        image.src = record.dataUrl;
      })
      .catch(() => {
        if (active) setImageState('error');
      });

    return () => {
      active = false;
      imageRef.current = null;
    };
  }, [screenshotId]);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setAvailable({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (active) setFontTick((value) => value + 1);
      });
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => panelRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    setColor(selected.color);
    setStrokeWidth(selected.strokeWidth);
  }, [selected]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || display.width <= 0 || display.height <= 0) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(display.width * ratio);
    canvas.height = Math.round(display.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, display.width, display.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, display.width, display.height);
    drawAnnotations(context, annotations, display.width, display.height);
    if (draft) drawAnnotations(context, [draft], display.width, display.height);
    if (selected) drawSelection(context, selected, display.width, display.height);
  }, [annotations, display, draft, selected, fontTick]);

  const readPoint = useCallback(
    (event: { currentTarget: HTMLCanvasElement; clientX: number; clientY: number }): Point => {
      const rect = event.currentTarget.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      return {
        x: clamp(px / rect.width, 0, 1),
        y: clamp(py / rect.height, 0, 1),
        px,
        py,
      };
    },
    [],
  );

  const findAnnotationAt = useCallback(
    (x: number, y: number): Annotation | null => {
      const context = getMeasureContext();
      if (!context || display.width <= 0) return null;
      for (let index = annotations.length - 1; index >= 0; index -= 1) {
        const annotation = annotations[index];
        if (
          hitTestAnnotation(
            context,
            annotation,
            x,
            y,
            display.width,
            display.height,
            9,
          )
        ) {
          return annotation;
        }
      }
      return null;
    },
    [annotations, display, getMeasureContext],
  );

  const pushHistory = useCallback((snapshot: Annotation[]) => {
    setPast((current) => [...current.slice(-(HISTORY_LIMIT - 1)), snapshot]);
    setFuture([]);
  }, []);

  const commit = useCallback(
    (next: Annotation[], before: Annotation[]) => {
      if (areEqual(next, before)) return;
      pushHistory(before);
      setAnnotations(next);
    },
    [pushHistory],
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const target = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([...future.slice(-(HISTORY_LIMIT - 1)), annotations]);
    setAnnotations(target);
    setSelectedId((current) =>
      target.some((annotation) => annotation.id === current) ? current : null,
    );
    setTextEditor(null);
  }, [annotations, future, past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const target = future[future.length - 1];
    setFuture(future.slice(0, -1));
    setPast([...past.slice(-(HISTORY_LIMIT - 1)), annotations]);
    setAnnotations(target);
    setSelectedId((current) =>
      target.some((annotation) => annotation.id === current) ? current : null,
    );
    setTextEditor(null);
  }, [annotations, future, past]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const next = annotations.filter((annotation) => annotation.id !== selectedId);
    if (next.length === annotations.length) return;
    commit(next, annotations);
    setSelectedId(null);
    if (textEditor?.id === selectedId) setTextEditor(null);
  }, [annotations, commit, selectedId, textEditor]);

  const applyStyle = useCallback(
    (nextColor: string, nextStroke: number) => {
      if (!selected) return;
      const next = annotations.map((annotation) =>
        annotation.id === selected.id
          ? { ...annotation, color: nextColor, strokeWidth: nextStroke }
          : annotation,
      );
      commit(next, annotations);
    },
    [annotations, commit, selected],
  );

  const chooseColor = useCallback(
    (value: string) => {
      setColor(value);
      if (selected) applyStyle(value, strokeWidth);
    },
    [applyStyle, selected, strokeWidth],
  );

  const chooseStroke = useCallback(
    (value: number) => {
      setStrokeWidth(value);
      if (selected) applyStyle(color, value);
    },
    [applyStyle, color, selected],
  );

  const addMarker = useCallback(
    (point: Point) => {
      const marker: Annotation = {
        id: createId(),
        type: 'marker',
        color,
        strokeWidth,
        x: point.x,
        y: point.y,
      };
      commit([...annotations, marker], annotations);
    },
    [annotations, color, commit, strokeWidth],
  );

  const openTextEditor = useCallback((x: number, y: number, annotation?: TextAnnotation) => {
    setTextEditor({
      id: annotation?.id ?? null,
      x: annotation?.x ?? x,
      y: annotation?.y ?? y,
      value: annotation?.text ?? '',
      initial: annotation?.text ?? '',
    });
  }, []);

  const saveTextEditor = useCallback(
    (editor: TextEditorState) => {
      const value = editor.value.trim();
      if (!value) {
        setTextEditor(null);
        return;
      }
      if (editor.id) {
        const next = annotations.map((annotation) =>
          annotation.id === editor.id && annotation.type === 'text'
            ? { ...annotation, text: value }
            : annotation,
        );
        commit(next, annotations);
      } else {
        const annotation: TextAnnotation = {
          id: createId(),
          type: 'text',
          color,
          strokeWidth,
          x: editor.x,
          y: editor.y,
          text: value,
          fontSize: DEFAULT_TEXT_SIZE,
        };
        commit([...annotations, annotation], annotations);
        setSelectedId(annotation.id);
      }
      setTextEditor(null);
    },
    [annotations, color, commit, strokeWidth],
  );

  const findHandleAt = useCallback(
    (annotation: Annotation, x: number, y: number) => {
      const context = getMeasureContext();
      if (!context) return null;
      if (annotation.type === 'rect' || annotation.type === 'ellipse') {
        return findResizeHandle(
          context,
          annotation,
          x,
          y,
          display.width,
          display.height,
        );
      }
      if (annotation.type === 'arrow') {
        return findArrowHandle(annotation, x, y, display.width, display.height);
      }
      return null;
    },
    [display, getMeasureContext],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.button !== 0 || imageState !== 'ready' || display.width <= 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = readPoint(event);

      if (tool === 'select') {
        if (selected) {
          const handle = findHandleAt(selected, point.px, point.py);
          if (handle) {
            if (selected.type === 'arrow' && 'endpoint' in handle) {
              dragRef.current = {
                kind: 'endpoint',
                id: selected.id,
                before: annotations,
                original: selected,
                endpoint: handle.endpoint,
              };
            } else if (selected.type === 'rect' || selected.type === 'ellipse') {
              dragRef.current = {
                kind: 'resize',
                id: selected.id,
                before: annotations,
                original: selected,
                corner: handle as ResizeHandle,
              };
            }
            return;
          }
        }

        const hit = findAnnotationAt(point.px, point.py);
        if (hit) {
          setSelectedId(hit.id);
          setTextEditor(null);
          dragRef.current = {
            kind: 'move',
            id: hit.id,
            start: point,
            before: annotations,
            original: hit,
          };
        } else {
          setSelectedId(null);
          setTextEditor(null);
        }
        return;
      }

      if (tool === 'arrow' || tool === 'rect' || tool === 'ellipse') {
        dragRef.current = {
          kind: 'draw',
          tool,
          start: point,
          before: annotations,
        };
        setSelectedId(null);
        return;
      }

      dragRef.current = { kind: 'click', tool, start: point, moved: false };
    },
    [annotations, display, findAnnotationAt, findHandleAt, imageState, readPoint, selected, tool],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const point = readPoint(event);
      const drag = dragRef.current;

      if (!drag) {
        if (tool === 'select') {
          let cursor = 'default';
          if (selected) {
            const handle = findHandleAt(selected, point.px, point.py);
            if (handle) {
              if ('endpoint' in handle) cursor = 'crosshair';
              else if (handle.horizontal === handle.vertical) cursor = 'nwse-resize';
              else cursor = 'nesw-resize';
            } else if (findAnnotationAt(point.px, point.py)) {
              cursor = 'move';
            }
          } else if (findAnnotationAt(point.px, point.py)) {
            cursor = 'move';
          }
          setHoverCursor((current) => (current === cursor ? current : cursor));
        }
        return;
      }

      if (drag.kind === 'draw') {
        const shape = buildShape(drag.tool, drag.start, point, color, strokeWidth);
        draftRef.current = shape;
        setDraft(shape);
        return;
      }

      if (drag.kind === 'click') {
        const distance = Math.hypot(point.px - drag.start.px, point.py - drag.start.py);
        if (distance > 6 && !drag.moved) drag.moved = true;
        return;
      }

      if (drag.kind === 'move') {
        drag.moved = true;
        const dx = point.x - drag.start.x;
        const dy = point.y - drag.start.y;
        const moved = moveAnnotation(drag.original, dx, dy);
        setAnnotations((current) =>
          current.map((annotation) => (annotation.id === drag.id ? moved : annotation)),
        );
        return;
      }

      if (drag.kind === 'resize') {
        drag.moved = true;
        const resized = resizeShape(drag.original, drag.corner, point);
        setAnnotations((current) =>
          current.map((annotation) => (annotation.id === drag.id ? resized : annotation)),
        );
        return;
      }

      if (drag.kind === 'endpoint') {
        drag.moved = true;
        const updated: ArrowAnnotation = {
          ...drag.original,
          ...(drag.endpoint === 'start'
            ? { x1: point.x, y1: point.y }
            : { x2: point.x, y2: point.y }),
        };
        setAnnotations((current) =>
          current.map((annotation) => (annotation.id === drag.id ? updated : annotation)),
        );
      }
    },
    [color, findAnnotationAt, findHandleAt, readPoint, selected, strokeWidth, tool],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const point = readPoint(event);

      if (drag.kind === 'draw') {
        const shape = draftRef.current ?? buildShape(drag.tool, drag.start, point, color, strokeWidth);
        draftRef.current = null;
        setDraft(null);
        if (shape) commit([...drag.before, shape], drag.before);
        return;
      }

      if (drag.kind === 'click') {
        if (drag.moved) return;
        if (drag.tool === 'marker') {
          addMarker(drag.start);
        } else {
          openTextEditor(drag.start.x, drag.start.y);
        }
        return;
      }

      if (drag.moved) pushHistory(drag.before);
    },
    [addMarker, color, commit, openTextEditor, pushHistory, readPoint, strokeWidth],
  );

  const cancelDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    draftRef.current = null;
    setDraft(null);
    if (drag && drag.kind !== 'draw' && drag.kind !== 'click' && drag.moved) {
      setAnnotations(drag.before);
    }
  }, []);

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (tool !== 'select') return;
      const point = readPoint(event);
      const hit = findAnnotationAt(point.px, point.py);
      if (hit?.type === 'text') {
        setSelectedId(hit.id);
        openTextEditor(hit.x, hit.y, hit);
      }
    },
    [findAnnotationAt, openTextEditor, readPoint, tool],
  );

  const requestClose = useCallback(() => {
    if (saving) return;
    if (hasUnsavedChanges) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose, saving]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (confirmReset || confirmClose) return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (textEditor) {
          setTextEditor(null);
        } else {
          requestClose();
        }
        return;
      }

      if (isTyping) return;

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmClose, confirmReset, deleteSelected, redo, requestClose, selectedId, textEditor, undo]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    let finalAnnotations = annotations;
    if (textEditor) {
      const value = textEditor.value.trim();
      if (value) {
        if (textEditor.id) {
          finalAnnotations = annotations.map((annotation) =>
            annotation.id === textEditor.id && annotation.type === 'text'
              ? { ...annotation, text: value }
              : annotation,
          );
        } else {
          finalAnnotations = [
            ...annotations,
            {
              id: createId(),
              type: 'text',
              color,
              strokeWidth,
              x: textEditor.x,
              y: textEditor.y,
              text: value,
              fontSize: DEFAULT_TEXT_SIZE,
            },
          ];
        }
      }
    }

    const cleaned = sanitizeAnnotations(finalAnnotations);
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(cleaned);
      onClose();
    } catch {
      setSaveError('تعذّر حفظ التعليقات. تحقق من مساحة التخزين وحاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  }, [annotations, color, onClose, onSave, saving, strokeWidth, textEditor]);

  const handleReset = useCallback(() => {
    commit([], annotations);
    setSelectedId(null);
    setTextEditor(null);
    setConfirmReset(false);
  }, [annotations, commit]);

  const canvasCursor =
    tool === 'select' ? hoverCursor : tool === 'text' ? 'text' : 'crosshair';

  const textEditorStyle = useMemo(() => {
    if (!textEditor || display.width <= 0) return null;
    const width = 248;
    const anchorX = textEditor.x * display.width;
    const anchorY = textEditor.y * display.height;
    const left = clamp(anchorX - 12, 4, Math.max(4, display.width - width - 4));
    const preferBelow = anchorY + 150 < display.height;
    const top = preferBelow
      ? anchorY + 10
      : clamp(anchorY - 150, 4, Math.max(4, display.height - 150));
    return { left, top, width };
  }, [display, textEditor]);

  const selectedMarkerOrder =
    selected?.type === 'marker' ? markerNumber(annotations, selected.id) : null;

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-stretch justify-center bg-[#191827]/45 sm:items-center sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-editor-title"
        tabIndex={-1}
        className="flex h-[100dvh] w-full max-w-[1220px] flex-col overflow-hidden bg-surface outline-none animate-fade-in sm:h-[min(92dvh,940px)] sm:rounded-2xl sm:border sm:border-line sm:shadow-float"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <PencilLine aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <h2
                id="annotation-editor-title"
                className="text-[15px] font-semibold text-ink"
              >
                تعديل الصورة
              </h2>
              <p className="truncate text-[11px] text-muted">
                الخطوة {stepNumber}
                {step.instruction ? ` · ${step.instruction}` : ' · بدون نص'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <span
                className="hidden items-center gap-1.5 rounded-full bg-[#FDF6E8] px-2.5 py-1 text-[11px] font-medium text-warning sm:inline-flex"
                aria-live="polite"
              >
                <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
                تغييرات غير محفوظة
              </span>
            ) : (
              <span className="hidden text-[11px] text-muted sm:block">لا تغييرات بعد</span>
            )}
            <IconButton label="إغلاق محرر الصورة" variant="ghost" size="sm" onClick={requestClose}>
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="order-2 flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-line bg-surface p-2 md:order-1 md:w-[78px] md:flex-col md:items-stretch md:overflow-visible md:border-t-0 md:border-e md:p-2.5">
            <div className="flex items-center gap-1 md:flex-col" role="group" aria-label="أدوات التعليق">
              {TOOLS.map((item) => {
                const Icon = item.icon;
                const active = tool === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={item.label}
                    title={item.label}
                    onClick={() => {
                      if (textEditor && textEditor.value.trim()) {
                        saveTextEditor(textEditor);
                      } else {
                        setTextEditor(null);
                      }
                      setTool(item.id);
                      setSelectedId(null);
                      setHoverCursor('default');
                    }}
                    className={cn(
                      'flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium transition-colors md:h-auto md:min-w-0 md:flex-col md:gap-0.5 md:py-2',
                      active
                        ? 'bg-primary text-white shadow-[0_1px_2px_rgba(78,34,159,0.25)]'
                        : 'text-muted hover:bg-[#F1EFF7] hover:text-ink',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    <span className="hidden md:block">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mx-1 h-7 w-px shrink-0 bg-line md:mx-0 md:my-1 md:h-px md:w-auto" />

            <div className="flex items-center gap-1 md:flex-col" role="group" aria-label="سجل التعديل">
              <button
                type="button"
                aria-label="تراجع"
                title="تراجع"
                disabled={past.length === 0}
                onClick={undo}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#F1EFF7] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-full"
              >
                <Undo2 aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label="إعادة"
                title="إعادة"
                disabled={future.length === 0}
                onClick={redo}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#F1EFF7] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-full"
              >
                <Redo2 aria-hidden="true" className="size-4" />
              </button>
            </div>

            <div className="mx-1 h-7 w-px shrink-0 bg-line md:mx-0 md:my-1 md:h-px md:w-auto" />

            <div
              className="flex shrink-0 items-center gap-2 md:mt-auto md:flex-col md:items-stretch md:gap-3"
              role="group"
              aria-label="ألوان وسماكة التعليق"
            >
              <div className="flex items-center gap-1.5 md:flex-wrap md:justify-center">
                {ANNOTATION_COLORS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-label={`لون ${item.label}`}
                    title={`لون ${item.label}`}
                    aria-pressed={color === item.value}
                    onClick={() => chooseColor(item.value)}
                    className={cn(
                      'size-6 shrink-0 rounded-full border-2 transition-[box-shadow,border-color]',
                      color === item.value
                        ? 'border-white ring-2 ring-primary/60'
                        : 'border-white shadow-[0_0_0_1px_#E9E7F1] hover:shadow-[0_0_0_1px_#C9C2DA]',
                    )}
                    style={{ backgroundColor: item.value }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-line bg-[#FAF9FD] p-0.5 md:flex-col">
                {STROKE_PRESETS.map((preset, index) => (
                  <button
                    key={preset.value}
                    type="button"
                    aria-label={`سماكة ${preset.label}`}
                    title={`سماكة ${preset.label}`}
                    aria-pressed={strokeWidth === preset.value}
                    onClick={() => chooseStroke(preset.value)}
                    className={cn(
                      'flex h-6 w-7 items-center justify-center rounded-md transition-colors',
                      strokeWidth === preset.value
                        ? 'bg-white text-primary shadow-card'
                        : 'text-muted hover:bg-white/70 hover:text-ink',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="block w-4 rounded-full bg-current"
                      style={{ height: index === 0 ? 2 : index === 1 ? 3.5 : 5 }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div
            ref={workspaceRef}
            className="order-1 flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#F5F5F9] p-3 md:order-2 md:p-5"
          >
            {imageState === 'loading' ? (
              <span className="flex flex-col items-center gap-3 text-[12px] text-muted">
                <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
                جارٍ تحميل اللقطة…
              </span>
            ) : imageState === 'error' ? (
              <div className="flex max-w-xs flex-col items-center rounded-2xl border border-line bg-surface px-6 py-8 text-center shadow-card">
                <ImageOff aria-hidden="true" className="size-6 text-warning" />
                <p className="mt-3 text-[13px] font-semibold text-ink">تعذّر تحميل اللقطة</p>
                <p className="mt-1.5 text-[12px] leading-6 text-muted">
                  قد تكون اللقطة محذوفة أو غير متاحة. أغلق المحرر وأعد رفع الصورة من الخطوة.
                </p>
                <Button variant="soft" size="sm" className="mt-4" onClick={onClose}>
                  إغلاق
                </Button>
              </div>
            ) : (
              <div
                className="relative shrink-0"
                style={{ width: display.width, height: display.height }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ width: display.width, height: display.height, cursor: canvasCursor }}
                  className="block touch-none rounded-md bg-white shadow-[0_1px_2px_rgba(25,24,39,0.08),0_14px_38px_-22px_rgba(25,24,39,0.4)]"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishDrag}
                  onPointerCancel={cancelDrag}
                  onDoubleClick={handleDoubleClick}
                  onPointerLeave={() => {
                    if (!dragRef.current) setHoverCursor('default');
                  }}
                  onContextMenu={(event) => event.preventDefault()}
                />

                {textEditor && textEditorStyle ? (
                  <form
                    className="absolute z-10 rounded-xl border border-line bg-surface p-2 shadow-pop animate-rise-in"
                    style={textEditorStyle}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (textEditor.value.trim()) saveTextEditor(textEditor);
                    }}
                  >
                    <label
                      htmlFor="annotation-text-input"
                      className="mb-1.5 block text-[11px] font-semibold text-muted"
                    >
                      نص التعليق
                    </label>
                    <textarea
                      id="annotation-text-input"
                      autoFocus
                      dir="auto"
                      rows={2}
                      maxLength={MAX_TEXT_LENGTH}
                      value={textEditor.value}
                      onChange={(event) =>
                        setTextEditor((current) =>
                          current
                            ? { ...current, value: wrapTextEditorValue(event.target.value) }
                            : current,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          if (textEditor.value.trim()) saveTextEditor(textEditor);
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          setTextEditor(null);
                        }
                      }}
                      placeholder="اكتب وصفًا قصيرًا…"
                      className="field min-h-[58px] resize-none px-2.5 py-2 text-[13px] leading-6"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted/80">
                        {textEditor.value.length}/{MAX_TEXT_LENGTH}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-[12px]"
                          onClick={() => setTextEditor(null)}
                        >
                          إلغاء
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          className="h-8 px-2.5 text-[12px]"
                          disabled={!textEditor.value.trim()}
                        >
                          حفظ النص
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {saveError ? (
          <div
            role="alert"
            className="flex shrink-0 items-start gap-2 border-t border-[#F3D4D9] bg-[#FDF1F3] px-4 py-2.5 text-[12px] leading-5 text-danger"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            {saveError}
          </div>
        ) : null}

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={requestClose} disabled={saving}>
              إلغاء
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={annotations.length === 0 || saving}
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              إعادة تعيين
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {selected ? (
              <span className="hidden text-[11px] text-muted lg:block">
                {selected.type === 'marker'
                  ? `علامة رقم ${selectedMarkerOrder ?? 1}`
                  : selected.type === 'text'
                    ? 'نص محدد'
                    : selected.type === 'arrow'
                      ? 'سهم محدد'
                      : selected.type === 'rect'
                        ? 'مستطيل محدد'
                        : 'دائرة محددة'}
              </span>
            ) : null}
            {selected?.type === 'text' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openTextEditor(selected.x, selected.y, selected)}
              >
                <PencilLine aria-hidden="true" className="size-3.5" />
                تحرير النص
              </Button>
            ) : null}
            {selected ? (
              <Button variant="ghost" size="sm" onClick={deleteSelected}>
                <Trash2 aria-hidden="true" className="size-3.5" />
                حذف المحدد
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!hasUnsavedChanges || saving}
              onClick={() => void handleSave()}
            >
              <Save aria-hidden="true" className="size-3.5" />
              حفظ التغييرات
            </Button>
          </div>
        </footer>
      </div>

      <Dialog
        open={confirmReset}
        title="إعادة تعيين التعليقات؟"
        description="ستُحذف كل التعليقات المرسومة على هذه اللقطة. يمكنك التراجع عن ذلك قبل الحفظ."
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
              إلغاء
            </Button>
            <Button variant="danger" size="sm" data-autofocus onClick={handleReset}>
              <RotateCcw aria-hidden="true" className="size-3.5" />
              مسح التعليقات
            </Button>
          </>
        }
      />

      <Dialog
        open={confirmClose}
        title="تجاهل التغييرات غير المحفوظة؟"
        description="لديك تعديلات لم تُحفظ بعد. إذا أغلقت المحرر الآن ستفقدها."
        onClose={() => setConfirmClose(false)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClose(false)}>
              متابعة التعديل
            </Button>
            <Button variant="danger" size="sm" data-autofocus onClick={onClose}>
              تجاهل والإغلاق
            </Button>
          </>
        }
      />
    </div>,
    document.body,
  );
}
