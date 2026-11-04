import { Sparkles, Check } from 'lucide-react';
import { CtaButton } from './CtaButton';
import { ProductMockup } from './ProductMockup';

interface HeroProps {
  t: (path: string) => string;
}

export function Hero({ t }: HeroProps) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(116, 64, 233, 0.10), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-soft bg-primary-soft px-3.5 py-1.5 text-[12px] font-semibold text-primary-ink dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
              <Sparkles aria-hidden="true" className="size-3.5" />
              {t('hero.eyebrow')}
            </span>
            <h1 className="mt-5 text-[38px] leading-[1.18] font-semibold tracking-tight text-ink sm:text-5xl lg:text-[56px] dark:text-slate-50">
              {t('hero.headline')} <span className="text-primary">{t('hero.accent')}</span>
            </h1>
            <p className="mt-5 text-base leading-8 text-muted sm:text-lg dark:text-slate-300">
              {t('hero.description')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton size="lg">{t('hero.primaryCta')}</CtaButton>
              <a
                href="#demo"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 text-sm font-semibold text-ink shadow-card transition-colors duration-150 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t('hero.secondaryCta')}
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
              {[
                { key: 'hero.trust1', icon: Check },
                { key: 'hero.trust2', icon: Check },
                { key: 'hero.trust3', icon: Check },
              ].map(({ key, icon: Icon }) => (
                <li key={key} className="flex items-center gap-2 text-[13px] font-medium text-muted dark:text-slate-400">
                  <Icon aria-hidden="true" className="size-4 text-success" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <ProductMockup t={t} variant="hero" />
          </div>
        </div>
      </div>
    </section>
  );
}
