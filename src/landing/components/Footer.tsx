import { CtaButton } from './CtaButton';
import { Logo } from '../../shared/components/Logo';
import { CHROME_WEB_STORE_URL } from '../../shared/launch';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-[#F8F6FE]">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-sm">
            <Logo markSize={30} subtitle="دليل — توثيق Chrome عربي" />
            <p className="mt-4 text-[14px] leading-7 text-muted">
              حوّل خطوات شغلك على المواقع إلى أدلة مصوّرة واضحة، واربح وقتك من إعادة الشرح.
            </p>
          </div>
          <nav aria-label="روابط التذييل">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
              <li>
                <a href="#features" className="text-muted transition-colors hover:text-primary-ink">
                  المميزات
                </a>
              </li>
              <li>
                <a href="#how" className="text-muted transition-colors hover:text-primary-ink">
                  كيف نعمل
                </a>
              </li>
              <li>
                <a href="#use-cases" className="text-muted transition-colors hover:text-primary-ink">
                  حالات الاستخدام
                </a>
              </li>
              <li>
                <a href="#faq" className="text-muted transition-colors hover:text-primary-ink">
                  الأسئلة
                </a>
              </li>
              <li>
                <a
                  href={CHROME_WEB_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted transition-colors hover:text-primary-ink"
                >
                  متجر Chrome
                </a>
              </li>
            </ul>
          </nav>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <CtaButton size="sm">حمّل الإضافة</CtaButton>
            <p className="text-[12px] text-ink/70">© {year} دليل. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
