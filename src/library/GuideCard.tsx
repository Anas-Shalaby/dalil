import {
  Copy,
  FileText,
  Monitor,
  MoreHorizontal,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../shared/components/IconButton';
import { ScreenshotView } from '../shared/components/ScreenshotView';
import { cn } from '../shared/cn';
import { formatRelativeDate, formatStepCount } from '../shared/format';
import type { Guide } from '../shared/types';

interface GuideCardProps {
  guide: Guide;
  busy: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPrint: () => void;
}

export function GuideCard({
  guide,
  busy,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onPrint,
}: GuideCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const thumbnail = guide.steps.find((step) => step.screenshotId)?.screenshotId ?? null;

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const runAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <article className="surface group flex flex-col transition-shadow hover:shadow-pop">
      <button
        type="button"
        onClick={onOpen}
        className="block text-right focus:outline-none"
        aria-label={`فتح الدليل: ${guide.title}`}
      >
        <div className="relative h-36 w-full overflow-hidden rounded-t-2xl border-b border-line bg-[#F4F2F9]">
          {thumbnail ? (
            <ScreenshotView
              screenshotId={thumbnail}
              alt={`معاينة الدليل ${guide.title}`}
              className="h-full w-full"
              imgClassName="object-cover object-top"
            />
          ) : (
            <div className="paper-grid flex h-full w-full items-center justify-center">
              <FileText aria-hidden="true" className="size-7 text-muted/50" />
            </div>
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-right focus:outline-none"
          >
            <h3 className="line-clamp-2 text-[14px] font-semibold leading-6 text-ink transition-colors group-hover:text-primary-ink">
              {guide.title}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-muted">
              {guide.source === 'desktop' ? (
                <span className="inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-ink">
                  <Monitor aria-hidden="true" className="size-2.5" />
                  الكمبيوتر
                </span>
              ) : null}
              <span>
                {formatStepCount(guide.steps.length)} · {formatRelativeDate(guide.updatedAt)}
              </span>
            </p>
          </button>

          <div className="relative" ref={menuRef}>
            <IconButton
              label="خيارات الدليل"
              size="sm"
              variant="ghost"
              disabled={busy}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </IconButton>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute end-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop animate-fade-in"
              >
                <MenuItem icon={Pencil} label="إعادة تسمية" onClick={() => runAction(onRename)} />
                <MenuItem icon={Copy} label="إنشاء نسخة" onClick={() => runAction(onDuplicate)} />
                <MenuItem icon={Printer} label="استوديو PDF" onClick={() => runAction(onPrint)} />
                <div className="my-1 h-px bg-line" />
                <MenuItem
                  icon={Trash2}
                  label="حذف الدليل"
                  danger
                  onClick={() => runAction(onDelete)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors',
        danger
          ? 'text-danger hover:bg-[#FCEFF1]'
          : 'text-ink hover:bg-[#F5F3FA]',
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </button>
  );
}
