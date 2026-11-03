import { BookOpen } from 'lucide-react';
import { USE_CASES } from '../content';

function CodeVisual() {
  return (
    <pre className="overflow-hidden rounded-xl border border-line bg-[#201A2D] p-4 font-mono text-[11px] leading-6 text-[#E9E7F1]">
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
        <span className="h-16 w-20 shrink-0 rounded-lg bg-[#F1ECFF] px-2 py-2 text-[9px] font-semibold text-primary-ink">جاهز</span>
        <span className="h-16 w-20 shrink-0 rounded-lg bg-[#F8F6FE] px-2 py-2 text-[9px] font-semibold text-muted">مراجعة</span>
        <span className="h-16 w-20 shrink-0 rounded-lg bg-[#F8F6FE] px-2 py-2 text-[9px] font-semibold text-muted">مشاركة</span>
      </div>
      <div className="h-2.5 w-2/3 rounded-full bg-[#E9E7F1]" />
    </div>
  );
}

function BookVisual() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-[#F8F6FE] p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <BookOpen aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-ink">جاهز للمشاركة</p>
        <p className="mt-0.5 text-[11px] leading-5 text-muted">الدليل النهائي جاهز للإرسال.</p>
      </div>
    </div>
  );
}

export function UseCases() {
  return (
    <section id="use-cases" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">حالات الاستخدام</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">دليل مناسب لطبيعة شغلك</h2>
          <p className="mt-4 text-[15px] leading-8 text-muted">
            سواء كنت مطوّرًا، مستقلًا، أو تدعم فريقًا — دليل يناسب الوظيفة وليس العكس.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {USE_CASES.map((useCase) => (
            <article
              key={useCase.title}
              className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
            >
              <div className="flex items-center justify-between bg-[#F8F6FE] px-6 pt-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <useCase.icon aria-hidden="true" className="size-5" />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-[17px] font-semibold text-ink">{useCase.title}</h3>
                <p className="mt-2 text-[14px] leading-7 text-muted">{useCase.description}</p>
              </div>
              <div className="px-6 pb-6">
                {useCase.title.includes('مطوّر') ? (
                  <CodeVisual />
                ) : useCase.title.includes('فرق') ? (
                  <BoardVisual />
                ) : (
                  <BookVisual />
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
