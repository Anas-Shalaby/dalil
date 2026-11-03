import { FileText, Monitor, Plus, RefreshCw, Search, Shield } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../shared/components/Button';
import { Dialog } from '../shared/components/Dialog';
import { Logo } from '../shared/components/Logo';
import { Toaster, useToasts } from '../shared/components/Toast';
import {
  humanizeBrowserError,
  openCapturePage,
  openEditorPage,
  openStudioPage,
  openPrivacyPage,
} from '../shared/chrome';
import { formatGuideCount, sortGuidesByUpdated } from '../shared/format';
import {
  duplicateGuide,
  duplicateGuideWithoutScreenshots,
  getGuides,
  removeGuide,
  renameGuide,
} from '../shared/guideService';
import { MAX_TITLE_LENGTH } from '../shared/constants';
import type { Guide } from '../shared/types';
import { GuideCard } from './GuideCard';

type LoadState = 'loading' | 'ready' | 'error';

export function LibraryApp() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Guide | null>(null);
  const [renameTarget, setRenameTarget] = useState<Guide | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(async () => {
    try {
      const result = await getGuides();
      setGuides(sortGuidesByUpdated(result));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return guides;
    return guides.filter((guide) => guide.title.toLowerCase().includes(normalized));
  }, [guides, query]);

  const openGuide = useCallback((guideId: string) => {
    void openEditorPage(guideId);
  }, []);

  const handleDuplicate = useCallback(
    async (guide: Guide) => {
      setBusyId(guide.id);
      try {
        let copy: Guide | null = null;
        const hasScreenshots = guide.steps.some((step) => step.screenshotId);
        if (hasScreenshots) {
          copy = await duplicateGuideWithoutScreenshots(guide.id);
        } else {
          copy = await duplicateGuide(guide.id);
        }
        if (!copy) {
          push({ message: 'تعذّر إنشاء نسخة من الدليل.', tone: 'error' });
          return;
        }
        await load();
        push({
          message: hasScreenshots
            ? 'أُنشئت نسخة بدون اللقطات لتوفير المساحة. أضف لقطات جديدة من المحرر.'
            : 'أُنشئت نسخة من الدليل.',
          tone: 'success',
        });
      } catch (error) {
        push({ message: humanizeBrowserError(error), tone: 'error' });
      } finally {
        setBusyId(null);
      }
    },
    [load, push],
  );

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await removeGuide(pendingDelete.id);
      await load();
      push({ message: 'حُذف الدليل نهائيًا.', tone: 'info' });
    } catch (error) {
      push({ message: humanizeBrowserError(error), tone: 'error' });
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  }, [pendingDelete, load, push]);

  const handleRename = useCallback(async () => {
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (!title) {
      push({ message: 'اكتب عنوانًا للدليل.', tone: 'error' });
      return;
    }
    setBusyId(renameTarget.id);
    try {
      await renameGuide(renameTarget.id, title);
      await load();
      push({ message: 'حُفظ العنوان الجديد.', tone: 'success' });
    } catch (error) {
      push({ message: humanizeBrowserError(error), tone: 'error' });
    } finally {
      setBusyId(null);
      setRenameTarget(null);
    }
  }, [renameTarget, renameValue, load, push]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Logo subtitle="أدلتي المحفوظة" />
          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-muted sm:block">
              {formatGuideCount(guides.length)}
            </span>
            <button
              type="button"
              onClick={() => void openPrivacyPage()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-[#F1EFF7] hover:text-ink"
            >
              <Shield aria-hidden="true" className="size-3.5" />
              الخصوصية
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">أدلتي المحفوظة</h1>
            <p className="mt-1.5 text-[13px] text-muted">
              كل الأدلة محفوظة محليًا في متصفحك. لا يتم إرسال أي شيء إلى الإنترنت.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => void openCapturePage()}
            >
              <Monitor aria-hidden="true" className="size-4" />
              التقاط من الكمبيوتر
            </Button>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث بعنوان الدليل…"
                aria-label="ابحث في الأدلة"
                className="field h-10 w-full pe-10 sm:w-64"
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => void load()}
              aria-label="تحديث القائمة"
              title="تحديث القائمة"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-7">
          {loadState === 'loading' ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="h-60 animate-pulse rounded-2xl border border-line bg-surface"
                />
              ))}
            </div>
          ) : loadState === 'error' ? (
            <div className="surface mx-auto max-w-md px-6 py-12 text-center">
              <h2 className="text-[15px] font-semibold text-ink">تعذّر تحميل الأدلة</h2>
              <p className="mt-1.5 text-[13px] leading-6 text-muted">
                حدث خطأ أثناء قراءة البيانات المحلية. أعد المحاولة، وإذا استمرت المشكلة فقد
                تكون البيانات تالفة.
              </p>
              <Button variant="soft" size="sm" className="mt-4" onClick={() => void load()}>
                <RefreshCw aria-hidden="true" className="size-3.5" />
                إعادة المحاولة
              </Button>
            </div>
          ) : guides.length === 0 ? (
            <div className="surface mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <FileText aria-hidden="true" className="size-6" />
              </span>
              <h2 className="mt-4 text-[16px] font-semibold text-ink">لا توجد أدلة بعد</h2>
              <p className="mt-2 max-w-sm text-[13px] leading-6 text-muted">
                ابدأ تسجيلًا من النافذة المنبثقة للإضافة، أو وثّق برنامجًا خارج المتصفح
                بالتقاط سطح المكتب. ستظهر أدلتك هنا مباشرة بعد إنهاء الجلسة.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void openCapturePage()}
                >
                  <Monitor aria-hidden="true" className="size-4" />
                  التقاط من الكمبيوتر
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => window.close()}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  العودة لبدء التسجيل
                </Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="surface mx-auto max-w-md px-6 py-12 text-center">
              <Search aria-hidden="true" className="mx-auto size-5 text-muted/70" />
              <h2 className="mt-3 text-[15px] font-semibold text-ink">لا نتائج مطابقة</h2>
              <p className="mt-1.5 text-[13px] text-muted">
                جرّب كلمات بحث مختلفة، أو امسح البحث لعرض كل الأدلة.
              </p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setQuery('')}>
                مسح البحث
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  busy={busyId === guide.id}
                  onOpen={() => openGuide(guide.id)}
                  onRename={() => {
                    setRenameTarget(guide);
                    setRenameValue(guide.title);
                  }}
                  onDuplicate={() => void handleDuplicate(guide)}
                  onDelete={() => setPendingDelete(guide)}
                  onPrint={() => void openStudioPage(guide.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={pendingDelete !== null}
        title="حذف الدليل نهائيًا؟"
        description={
          pendingDelete
            ? `سيُحذف «${pendingDelete.title}» مع كل خطواته ولقطاته. لا يمكن التراجع عن هذا الإجراء.`
            : ''
        }
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busyId === pendingDelete?.id}
              data-autofocus
              onClick={() => void handleDelete()}
            >
              حذف نهائي
            </Button>
          </>
        }
      />

      <Dialog
        open={renameTarget !== null}
        title="إعادة تسمية الدليل"
        onClose={() => setRenameTarget(null)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRenameTarget(null)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={busyId === renameTarget?.id}
              onClick={() => void handleRename()}
            >
              حفظ
            </Button>
          </>
        }
      >
        <label htmlFor="rename-input" className="eyebrow">
          العنوان الجديد
        </label>
        <input
          id="rename-input"
          value={renameValue}
          maxLength={MAX_TITLE_LENGTH}
          data-autofocus
          onChange={(event) => setRenameValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleRename();
          }}
          className="field mt-1.5"
        />
      </Dialog>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
