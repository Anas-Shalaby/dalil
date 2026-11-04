import { LangProvider, useLang } from './lang';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Trust } from './components/Trust';
import { Problem } from './components/Problem';
import { Features } from './components/Features';
import { Examples } from './components/Examples';
import { HowItWorks } from './components/HowItWorks';
import { Demo } from './components/Demo';
import { UseCases } from './components/UseCases';
import { BeforeAfter } from './components/BeforeAfter';
import { Privacy } from './components/Privacy';
import { Faq } from './components/Faq';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';
import { LazySection } from './components/LazySection';

export function LandingPageInner() {
  const { lang, setLang, t } = useLang();

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors duration-300 dark:bg-slate-900 dark:text-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        {t('skipLink')}
      </a>
      <Nav lang={lang} setLang={setLang} t={t} />
      <main id="main-content">
        <Hero t={t} />
        <LazySection>
          <Trust />
        </LazySection>
        <LazySection>
          <Problem />
        </LazySection>
        <LazySection>
          <Features t={t} />
        </LazySection>
        <LazySection>
          <Examples />
        </LazySection>
        <LazySection>
          <HowItWorks />
        </LazySection>
        <LazySection>
          <Demo />
        </LazySection>
        <LazySection>
          <UseCases />
        </LazySection>
        <LazySection>
          <BeforeAfter />
        </LazySection>
        <LazySection>
          <Privacy />
        </LazySection>
        <LazySection>
          <Faq />
        </LazySection>
      </main>
      <FinalCta />
      <Footer />
    </div>
  );
}

export function LandingPage() {
  return (
    <LangProvider>
      <LandingPageInner />
    </LangProvider>
  );
}
