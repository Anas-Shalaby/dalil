import { ShieldCheck } from 'lucide-react';
import { useLang } from '../lang';

export function Privacy() {
  const { strings } = useLang();
  const privacy = strings.privacy;
  return (
    <section id="privacy" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="rounded-3xl border border-line bg-[#F8F6FE] p-6 sm:p-8 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary dark:bg-primary/10">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-ink dark:text-slate-50">
              {privacy.subtitle}
            </h2>
            <p className="mt-3 text-[15px] leading-8 text-muted dark:text-slate-300">
              {privacy.description}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-primary">{privacy.title}</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl dark:text-slate-50">
              {privacy.rightHeading}
            </h2>
            <p className="mt-4 text-[15px] leading-8 text-muted dark:text-slate-300">
              {privacy.rightText}
            </p>
            <ul className="mt-6 space-y-3">
              {privacy.points.map((point) => (
                <li key={point.title} className="flex items-start gap-2.5 text-[14px] leading-7 text-ink dark:text-slate-100">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <span>
                    <span className="block font-semibold text-ink dark:text-slate-100">{point.title}</span>
                    <span className="mt-0.5 block text-muted dark:text-slate-400">{point.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <a
              href={privacy.ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex text-[14px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              {privacy.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
