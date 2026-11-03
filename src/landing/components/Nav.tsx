import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '../../shared/components/Logo';
import { CtaButton } from './CtaButton';

const NAV_LINKS = [
  { id: 'features', label: 'المميزات' },
  { id: 'how', label: 'كيف نعمل' },
  { id: 'use-cases', label: 'حالات الاستخدام' },
  { id: 'faq', label: 'الأسئلة' },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

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
    'block rounded-xl px-4 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-[#F1ECFF] hover:text-primary-ink';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" className="flex items-center" onClick={close}>
          <Logo markSize={30} />
        </a>

        <nav className="hidden md:flex" aria-label="التنقل الرئيسي">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a href={`#${link.id}`} className="rounded-xl px-3.5 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-[#F1ECFF] hover:text-primary-ink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <CtaButton size="sm">{'حمّل الإضافة'}</CtaButton>
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors hover:border-primary/40 hover:text-primary md:hidden"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-navigation" className="border-t border-line bg-surface md:hidden">
          <nav aria-label="التنقّل الرئيسي">
            <ul className="mx-auto max-w-6xl px-5 py-3">
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} className={linkClass} onClick={close}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-5">
              <CtaButton size="sm" className="w-full">
                {'حمّل الإضافة'}
              </CtaButton>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
