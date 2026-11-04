import { useLang } from '../lang';

export function HowItWorks() {
  const { strings } = useLang();
  const how = strings.how;
  return (
    <section id="how" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">{how.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl dark:text-slate-50">
            {how.headline}
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-muted dark:text-slate-300">
            {how.description}
          </p>
        </div>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {how.steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-line bg-surface p-6 shadow-card dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <span className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-primary/10">
                  <span aria-hidden="true" className="size-5">📷</span>
                </span>
                <span className="text-4xl font-semibold text-primary-ink dark:text-primary-soft">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </span>
              <h3 className="mt-5 text-[17px] font-semibold text-ink dark:text-slate-50">
                {step.title}
              </h3>
              <p className="mt-2 text-[14px] leading-7 text-muted dark:text-slate-300">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
