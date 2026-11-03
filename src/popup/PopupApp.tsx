import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Monitor,
  Pause,
  Play,
  Plus,
  Shield,
  Square,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../shared/components/Button';
import { GuideArtwork, Logo } from '../shared/components/Logo';
import { Toaster, useToasts } from '../shared/components/Toast';
import {
  humanizeBrowserError,
  openCapturePage,
  openEditorPage,
  openLibraryPage,
  openPrivacyPage,
  sendRuntimeMessage,
} from '../shared/chrome';
import { cn } from '../shared/cn';
import {
  formatDuration,
  formatGuideCount,
  formatRelativeDate,
  formatStepCount,
} from '../shared/format';
import { useRecordingState } from '../shared/hooks/useRecordingState';
import type {
  StartRecordingResponse,
  StopRecordingResponse,
} from '../shared/messages';
import type { RecordingNotice } from '../shared/types';

const NOTICE_ICON: Record<RecordingNotice['kind'], typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const NOTICE_TONE: Record<RecordingNotice['kind'], string> = {
  info: 'border-primary/20 bg-primary-soft text-primary-ink',
  warning: 'border-[#F0D9AE] bg-[#FDF6E8] text-warning',
  error: 'border-[#F3C7CE] bg-[#FCEFF1] text-danger',
};

function RecordingCard({
  session,
  busy,
  onPause,
  onResume,
  onStop,
}: {
  session: NonNullable<ReturnType<typeof useRecordingState>['session']>;
  busy: string | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const paused = session.status === 'paused';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-2 rounded-full',
                paused ? 'bg-warning' : 'animate-soft-pulse bg-danger',
              )}
              aria-hidden="true"
            />
            <span className="text-[13px] font-semibold text-ink">
              {paused ? 'التسجيل متوقف مؤقتًا' : 'جارٍ تسجيل الخطوات'}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted" title={session.tabTitle}>
            {session.tabTitle}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-[#F4F2F9] px-2 py-1 font-mono text-xs tabular-nums text-ink">
          {formatDuration(session.startedAt, now)}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-line">
        <div className="px-4 py-3 text-center">
          <span className="block text-lg font-semibold text-ink">{session.stepCount}</span>
          <span className="eyebrow">الخطوات المسجّلة</span>
        </div>
        <div className="px-4 py-3 text-center">
          <span className="block truncate text-lg font-semibold text-ink" title={session.siteHost}>
            {session.siteHost || 'صفحة الويب'}
          </span>
          <span className="eyebrow">الموقع الحالي</span>
        </div>
      </div>

      {session.lastScreenshotError ? (
        <p className="border-t border-line bg-[#FDF6E8] px-4 py-2.5 text-[11px] leading-5 text-warning">
          {session.lastScreenshotError}
        </p>
      ) : null}

      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        {paused ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onResume}
            loading={busy === 'resume'}
          >
            <Play aria-hidden="true" className="size-3.5" />
            متابعة
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onPause}
            loading={busy === 'pause'}
          >
            <Pause aria-hidden="true" className="size-3.5" />
            إيقاف مؤقت
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          className="flex-1"
          onClick={onStop}
          loading={busy === 'stop'}
        >
          <Square aria-hidden="true" className="size-3" fill="currentColor" />
          إنهاء وعرض الدليل
        </Button>
      </div>
    </div>
  );
}

function IdleCard({
  onStart,
  onCaptureDesktop,
  busy,
}: {
  onStart: () => void;
  onCaptureDesktop: () => void;
  busy: boolean;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">ابدأ توثيق خطواتك</h2>
          <p className="mt-1.5 text-[13px] leading-6 text-muted">
            سجّل التفاعل على الصفحة، وسيبني دليل خطوات مرقّمة قابلة للتحرير والطباعة.
          </p>
        </div>
        <GuideArtwork className="hidden w-[74px] shrink-0 sm:block" />
      </div>

      <Button size="lg" className="mt-4 w-full" onClick={onStart} loading={busy}>
        <Plus aria-hidden="true" className="size-4" />
        ابدأ التسجيل
      </Button>

      <Button
        variant="secondary"
        size="md"
        className="mt-2 w-full"
        onClick={onCaptureDesktop}
        disabled={busy}
      >
        <Monitor aria-hidden="true" className="size-4" />
        التقاط من الكمبيوتر
      </Button>
      <p className="mt-2 text-center text-[11px] leading-5 text-muted">
        لتوثيق برنامج أو نافذة خارج المتصفح. يعمل في صفحة مستقلة ويحفظ اللقطات محليًا.
      </p>

      <ul className="mt-4 space-y-2 text-[12px] text-muted">
        <li className="flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="size-3.5 text-success" />
          يبقى كل شيء على جهازك، بلا حساب ولا خدمات خارجية.
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="size-3.5 text-success" />
          طلبات الإذن تُطلب مرة واحدة عند بدء التسجيل.
        </li>
      </ul>
    </div>
  );
}

function UnsupportedCard({ reason }: { reason: string }) {
  return (
    <div className="surface flex items-start gap-3 p-4">
      <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-[#FDF6E8] text-warning">
        <AlertTriangle aria-hidden="true" className="size-4" />
      </span>
      <div>
        <p className="text-[13px] font-semibold text-ink">هذه الصفحة غير مدعومة</p>
        <p className="mt-1 text-[12px] leading-5 text-muted">{reason}</p>
      </div>
    </div>
  );
}

export function PopupApp() {
  const { ready, session, currentTab, lastNotice, recentGuides, dismissNotice, refresh } =
    useRecordingState();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const handleStart = useCallback(async () => {
    if (!currentTab) return;
    setBusy('start');
    setActionError(null);
    try {
      const response = await sendRuntimeMessage<StartRecordingResponse>({
        type: 'DALIL_START_RECORDING',
        tabId: currentTab.id,
      });
      if (!response?.ok) {
        setActionError(response?.error ?? 'تعذّر بدء التسجيل.');
        return;
      }
      push({
        message: 'بدأ التسجيل. تفاعل مع الصفحة وستُسجَّل الخطوات هنا.',
        tone: 'success',
      });
      await refresh();
    } catch (error) {
      setActionError(humanizeBrowserError(error));
    } finally {
      setBusy(null);
    }
  }, [currentTab, push, refresh]);

  const handlePause = useCallback(async () => {
    setBusy('pause');
    try {
      await sendRuntimeMessage({ type: 'DALIL_PAUSE_RECORDING' });
      await refresh();
    } catch (error) {
      setActionError(humanizeBrowserError(error));
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const handleResume = useCallback(async () => {
    setBusy('resume');
    try {
      await sendRuntimeMessage({ type: 'DALIL_RESUME_RECORDING' });
      await refresh();
    } catch (error) {
      setActionError(humanizeBrowserError(error));
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const handleStop = useCallback(async () => {
    setBusy('stop');
    try {
      const response = await sendRuntimeMessage<StopRecordingResponse>({
        type: 'DALIL_STOP_RECORDING',
        openEditor: true,
      });
      if (!response?.ok) {
        setActionError(response?.error ?? 'تعذّر إيقاف التسجيل.');
        return;
      }
      window.close();
    } catch (error) {
      setActionError(humanizeBrowserError(error));
    } finally {
      setBusy(null);
    }
  }, []);

  const handleOpenGuide = useCallback(async (guideId: string) => {
    try {
      await openEditorPage(guideId);
      window.close();
    } catch (error) {
      setActionError(humanizeBrowserError(error));
    }
  }, []);

  const notice = lastNotice;
  const NoticeIcon = notice ? NOTICE_ICON[notice.kind] : Info;
  const showUnsupported =
    !session && currentTab !== null && !currentTab.supported && ready;

  return (
    <div className="flex min-h-[440px] flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <Logo subtitle="توثيق خطوات الويب" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void openLibraryPage().then(() => window.close())}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-[#F1EFF7] hover:text-ink"
          >
            <BookOpen aria-hidden="true" className="size-3.5" />
            أدلتي
          </button>
          <button
            type="button"
            onClick={() => void openPrivacyPage()}
            aria-label="سياسة الخصوصية"
            title="سياسة الخصوصية"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#F1EFF7] hover:text-ink"
          >
            <Shield aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {notice ? (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[12px] leading-5',
              NOTICE_TONE[notice.kind],
            )}
          >
            <NoticeIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1">{notice.message}</p>
            <button
              type="button"
              onClick={() => void dismissNotice()}
              aria-label="إغلاق التنبيه"
              className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ) : null}

        {actionError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[#F3C7CE] bg-[#FCEFF1] px-3.5 py-3 text-[12px] leading-5 text-danger"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1">{actionError}</p>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label="إغلاق الرسالة"
              className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ) : null}

        {!ready ? (
          <div className="space-y-3">
            <div className="h-[196px] animate-pulse rounded-2xl border border-line bg-surface" />
            <div className="h-10 animate-pulse rounded-xl border border-line bg-surface" />
          </div>
        ) : session ? (
          <RecordingCard
            session={session}
            busy={busy}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
          />
        ) : (
          <>
            {showUnsupported ? (
              <UnsupportedCard
                reason={currentTab?.unsupportedReason ?? 'جرّب صفحة ويب عادية.'}
              />
            ) : null}
            <IdleCard
              onStart={handleStart}
              onCaptureDesktop={() => {
                void openCapturePage()
                  .then(() => window.close())
                  .catch((error) => setActionError(humanizeBrowserError(error)));
              }}
              busy={busy === 'start'}
            />
          </>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="eyebrow">أحدث الأدلة</h2>
            {recentGuides.length > 0 ? (
              <button
                type="button"
                onClick={() => void openLibraryPage().then(() => window.close())}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover"
              >
                عرض الكل
                <ExternalLink aria-hidden="true" className="size-3" />
              </button>
            ) : null}
          </div>

          {recentGuides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-5 text-center">
              <FileText aria-hidden="true" className="mx-auto size-5 text-muted/70" />
              <p className="mt-2 text-[12px] leading-5 text-muted">
                لا توجد أدلة بعد. ابدأ أول تسجيل وستظهر أدلتك هنا.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {recentGuides.map((guide) => (
                <li key={guide.id}>
                  <button
                    type="button"
                    onClick={() => void handleOpenGuide(guide.id)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-right transition-colors hover:border-[#DCD8E8] hover:bg-[#FBFAFE]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-ink">
                      <FileText aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {guide.title}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {formatStepCount(guide.steps.length)} ·{' '}
                        {formatRelativeDate(guide.updatedAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="flex items-center justify-between border-t border-line bg-surface px-4 py-2.5">
        <span className="text-[11px] text-muted">
          {recentGuides.length > 0
            ? formatGuideCount(recentGuides.length)
            : 'بياناتك محلية بالكامل'}
        </span>
        <button
          type="button"
          onClick={() => void openPrivacyPage()}
          className="text-[11px] font-medium text-muted transition-colors hover:text-primary"
        >
          الخصوصية وحدود التسجيل
        </button>
      </footer>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
