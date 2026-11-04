import { CtaButton } from './CtaButton';
import { Logo } from '../../shared/components/Logo';
import { useLang } from '../lang';

export function Footer() {
  const { strings } = useLang();
  const footer = strings.footer;
  return (
    <footer className="border-t border-line bg-[#F8F6FE] dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-sm">
            <Logo markSize={30} subtitle={strings.nav.brand} />
            <p className="mt-4 text-[14px] leading-7 text-ink/60 dark:text-slate-400">
              {footer.description}
            </p>
          </div>
          <nav aria-label={strings.nav.features}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
              {footer.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-ink/60 transition-colors hover:text-primary-ink dark:text-slate-400 dark:hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <CtaButton size="sm">{strings.nav.install}</CtaButton>
            <p className="text-[12px] text-ink dark:text-slate-400">
              {strings.footer.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
