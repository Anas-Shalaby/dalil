import { Check, X } from 'lucide-react';
import { useLang } from '../lang';

export function BeforeAfter() {
  const { strings } = useLang();
  const ba = strings.beforeAfter;
  return (
    <section id="before-after" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">{ba.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl dark:text-slate-50">
            {ba.headline}
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-muted dark:text-slate-300">
            {ba.description}
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <p className="text-[13px] font-semibold text-danger">{ba.before.title}</p>
            <h3 className="mt-1 text-xl font-semibold text-ink dark:text-slate-50">{ba.before.subtitle}</h3>
            <ul className="mt-6 space-y-3">
              {ba.before.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] leading-7 text-ink dark:text-slate-100">
                  <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-[#DBEAFE]/60 p-6 shadow-card sm:p-8 dark:border-primary/20 dark:bg-primary/10 dark:text-slate-100">
            <p className="text-[13px] font-semibold text-primary">{ba.after.title}</p>
            <h3 className="mt-1 text-xl font-semibold text-ink dark:text-slate-50">{ba.after.subtitle}</h3>
            <ul className="mt-6 space-y-3">
              {ba.after.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] leading-7 text-ink dark:text-slate-100">
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
