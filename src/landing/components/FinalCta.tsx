import { CtaButton } from './CtaButton';
import { useLang } from '../lang';

export function FinalCta() {
  const { strings } = useLang();
  const cta = strings.finalCta;
  return (
    <section className="pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#1E40AF] via-[#1D4ED8] to-[#2563EB] px-6 py-16 text-center sm:px-12 sm:py-20 dark:from-slate-900 dark:via-slate-800 dark:to-[#1E40AF]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -start-24 size-72 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 end-24 size-80 rounded-full bg-[#DBEAFE]/20 dark:bg-primary/10"
          />
          <div className="relative mx-auto max-w-2xl">
            <p className="text-[12px] font-semibold tracking-wide text-[#E9E0FD]">{cta.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              {cta.headline} <span className="text-[#DBEAFE]">{cta.accent}</span>
            </h2>
            <p className="mt-4 text-[15px] leading-8 text-[#E9E0FD]">{cta.description}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <CtaButton size="lg" variant="light">
                {cta.primaryCta}
              </CtaButton>
              <a
                href="#demo"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {cta.secondaryCta}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
