import { Check, X } from 'lucide-react';
import { BEFORE_AFTER } from '../content';

export function BeforeAfter() {
  const before = BEFORE_AFTER.before;
  const after = BEFORE_AFTER.after;

  return (
    <section id="before-after" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">التحول</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">من إكراه إلى احترافية</h2>
          <p className="mt-4 text-[15px] leading-8 text-muted">
            الفرق بين شرح مرةً وأدلة جاهزة — وبين رسالة عشوائية ودليل مرتب.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
            <p className="text-[13px] font-semibold text-danger">قبل دليل</p>
            <h3 className="mt-1 text-xl font-semibold text-ink">{before.title}</h3>
            <p className="mt-1 text-[13px] text-muted">{before.subtitle}</p>
            <ul className="mt-6 space-y-3">
              {before.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] leading-7 text-ink">
                  <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-[#F1ECFF]/60 p-6 shadow-card sm:p-8">
            <p className="text-[13px] font-semibold text-primary">بعد دليل</p>
            <h3 className="mt-1 text-xl font-semibold text-ink">{after.title}</h3>
            <p className="mt-1 text-[13px] text-muted">{after.subtitle}</p>
            <ul className="mt-6 space-y-3">
              {after.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] leading-7 text-ink">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
