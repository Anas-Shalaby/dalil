import { ShieldCheck } from 'lucide-react';
import { PRIVACY_POLICY_URL } from '../../shared/launch';

const POINTS = [
  {
    title: 'ما يصلح إلى التسجيل',
    text: 'النقر على الأزرار والروابط والتسجيلات الشائعة داخل الصفحة النشطة.',
  },
  {
    title: 'ما يُتجاهل',
    text: 'حقول الإدخال والقوائم التي قد تحتوي على محتوى حساس.',
  },
  {
    title: 'أين تبقى البيانات',
    text: 'في متصفحك وchrome.storage.local، وبلا رفع لأي خدمة.',
  },
];

export function Privacy() {
  return (
    <section id="privacy" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="rounded-3xl border border-line bg-[#F8F6FE] p-6 sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-ink">بياناتك تبقى على جهازك</h2>
            <p className="mt-3 text-[15px] leading-8 text-muted">
              دليل ما فيه حساب ولا خادم ولا تتبع. كل الأدلة واللقطات تُحفظ داخل متصفحك، ويُصدر
              PDF من المتصفح نفسه — بلا رفع أي محتوى.
            </p>
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-primary">الخصوصية</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">لا تحرّم، بل احمِ</h2>
            <p className="mt-4 text-[15px] leading-8 text-muted">
              نحن ندرك أن أي إضافة تفاعلية تطرح أسئلة أولية. هدفنا أن تكون النبرة واضحة قبل ما
              تثبّت: ماذا يلامس النظام، وأين تذهب البيانات، ولماذا لا نرسل لك شيئًا.
            </p>
            <ul className="mt-6 space-y-3">
              {POINTS.map((point) => (
                <li key={point.title} className="flex items-start gap-2.5 text-[14px] leading-7 text-ink">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <span>
                    <span className="block font-semibold text-ink">{point.title}</span>
                    <span className="mt-0.5 block text-muted">{point.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex text-[14px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              اقرأ سياسة الخصوصية كاملة
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
