import { CtaButton } from './CtaButton';
import { FINAL_CTA } from '../content';

export function FinalCta() {
  return (
    <section className="pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#43218C] via-[#4E229F] to-[#7440E9] px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -start-24 size-72 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 end-24 size-80 rounded-full bg-[#F1ECFF]/20"
          />
          <div className="relative mx-auto max-w-2xl">
            <p className="text-[12px] font-semibold tracking-wide text-[#E9E0FD]">{FINAL_CTA.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              {FINAL_CTA.headlineBefore} <span className="text-[#F1ECFF]">{FINAL_CTA.headlineAccent}</span>
            </h2>
            <p className="mt-4 text-[15px] leading-8 text-[#E9E0FD]">{FINAL_CTA.description}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <CtaButton size="lg" variant="light">
                {FINAL_CTA.primaryCta}
              </CtaButton>
              <a
                href="#demo"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {FINAL_CTA.secondaryCta}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
