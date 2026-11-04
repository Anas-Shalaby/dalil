import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, Globe } from 'lucide-react';
import { Logo } from '../../shared/components/Logo';
import { CtaButton } from './CtaButton';

const NAV_LINKS = [
  { id: 'features', key: 'nav.features' },
  { id: 'how', key: 'nav.howItWorks' },
  { id: 'use-cases', key: 'nav.useCases' },
  { id: 'faq', key: 'nav.faq' },
] as const;

interface NavProps {
  lang: 'ar' | 'en';
  setLang: (next: 'ar' | 'en') => void;
  t: (path: string) => string;
}

export function Nav({ lang, setLang, t }: NavProps) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const saved = localStorage.getItem('dalil-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved ? saved === 'dark' : systemDark;
    setDark(initial);
    if (initial) html.classList.add('dark');
    else html.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('dalil-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  const switchLanguage = () => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  const linkClass =
    'block rounded-xl px-4 py-2.5 text-[15px] font-medium text-ink dark:text-slate-100 transition-colors hover:bg-[#DBEAFE] hover:text-primary-ink dark:hover:bg-slate-700 dark:hover:text-white';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" className="flex items-center" onClick={close}>
          <Logo markSize={30} />
        </a>

        <nav className="hidden md:flex" aria-label={t('nav.features')}>
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={linkClass}
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <CtaButton size="sm">{t('nav.install')}</CtaButton>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors duration-200 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={t('nav.toggleTheme')}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors duration-200 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ml-2 md:hidden"
            aria-label={t('nav.toggleLanguage')}
            onClick={switchLanguage}
          >
            <Globe aria-hidden="true" className="size-5" />
          </button>
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors duration-200 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              aria-label={t('nav.toggleTheme')}
              onClick={toggleTheme}
            >
              {dark ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
            </button>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors duration-200 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ml-2"
              aria-label={t('nav.toggleLanguage')}
              onClick={switchLanguage}
            >
              <Globe aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div id="mobile-navigation" className="border-t border-line bg-surface md:hidden dark:border-slate-700 dark:bg-slate-900">
          <nav aria-label={t('nav.features')}>
            <ul className="mx-auto max-w-6xl px-5 py-3">
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} className={linkClass} onClick={close}>
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-5 space-y-2">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                onClick={toggleTheme}
              >
                {dark ? <Sun aria-hidden="true" className="mr-2 size-5" /> : <Moon aria-hidden="true" className="mr-2 size-5" />}
                {t('nav.toggleTheme')}
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                onClick={switchLanguage}
              >
                <Globe aria-hidden="true" className="mr-2 size-5" />
                {t('nav.toggleLanguage')}
              </button>
              <CtaButton size="sm" className="w-full mt-2">
                {t('nav.install')}
              </CtaButton>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
