import { Video, Users, BookOpen } from 'lucide-react';
import { useLang } from '../lang';

function CodeVisual() {
  return (
    <pre className="overflow-hidden rounded-xl border border-line bg-[#201A2D] p-4 font-mono text-[11px] leading-6 text-[#E9E7F1] dark:border-slate-700">
      <code>{`$ dalil start
✓ recording on
✓ capture step 1…3
✓ annotated screenshot
✓ guide ready`}</code>
    </pre>
  );
}

function BoardVisual() {
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <span className="h-16 w-20 shrink-0 rounded-lg bg-[#DBEAFE] px-2 py-2 text-[9px] font-semibold text-primary-ink dark:bg-primary/10 dark:text-primary">جاهز</span>
        <span className="h-16 w-20 shrink-0 rounded-lg bg-[#F8F6FE] px-2 py-2 text-[9px] font-semibold text-ink/60 dark:bg-slate-800 dark:text-slate-400">مراجعة</span>
        <span className="h-16 w-20 shrink-0 rounded-lg bg-[#F8F6FE] px-2 py-2 text-[9px] font-semibold text-ink/60 dark:bg-slate-800 dark:text-slate-400">مشاركة</span>
      </div>
      <div className="h-2.5 w-2/3 rounded-full bg-[#E9E7F1] dark:bg-slate-700" />
    </div>
  );
}

function BookVisual() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-[#F8F6FE] p-4 dark:border-slate-700 dark:bg-slate-800">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-primary/10">
        <BookOpen aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-ink dark:text-slate-50">جاهز للمشاركة</p>
        <p className="mt-0.5 text-[11px] leading-5 text-muted dark:text-slate-400">الدليل النهائي جاهز للإرسال.</p>
      </div>
    </div>
  );
}

export function UseCases() {
  const { strings } = useLang();
  const useCases = strings.useCases;
  return (
    <section id="use-cases" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">{useCases.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl dark:text-slate-50">
            {useCases.headline}
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-muted dark:text-slate-300">
            {useCases.description}
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {useCases.items.map((useCase, index) => {
            const Visual = index === 0 ? CodeVisual : index === 1 ? BoardVisual : BookVisual;
            return (
              <article
                key={useCase.title}
                className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <div className="flex items-center justify-between bg-[#F8F6FE] px-6 pt-5 dark:bg-slate-800/50">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-primary/10">
                    {index === 0 ? <Video aria-hidden="true" className="size-5" /> : index === 1 ? <Users aria-hidden="true" className="size-5" /> : <BookOpen aria-hidden="true" className="size-5" />}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-[17px] font-semibold text-ink dark:text-slate-50">{useCase.title}</h3>
                  <p className="mt-2 text-[14px] leading-7 text-muted dark:text-slate-300">{useCase.description}</p>
                </div>
                <div className="px-6 pb-6">
                  <Visual />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
