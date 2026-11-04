import { ShieldCheck, Lock, Download } from 'lucide-react';
import { useLang } from '../lang';

export function Trust() {
  const { strings } = useLang();
  const trust = strings.trust;
  return (
    <section id="trust" className="py-10 sm:py-14" aria-labelledby="trust-title">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="surface flex flex-col gap-8 rounded-3xl bg-[#DBEAFE]/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:p-10 dark:bg-slate-800/60 dark:border-slate-700">
          <div className="max-w-xl">
            <p className="text-[12px] font-semibold tracking-wide text-primary">{trust.title}</p>
            <h2 id="trust-title" className="mt-3 text-2xl font-semibold text-ink sm:text-3xl dark:text-slate-50">
              {trust.subtitle}
            </h2>
            <p className="mt-3 text-[15px] leading-8 text-muted dark:text-slate-300">
              {trust.description}
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {trust.items.map((item, index) => (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:min-w-[150px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-primary/10">
                  {(() => { const Icon = [ShieldCheck, Lock, Download][index]; return <Icon aria-hidden="true" className="size-4" />; })()}
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink dark:text-slate-100">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[12px] leading-6 text-muted dark:text-slate-400">
                    {item.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
