import {
  CheckCircle2,
  ImageOff,
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
  WifiOff,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../shared/components/Button';
import { Logo } from '../shared/components/Logo';
import { openLibraryPage } from '../shared/chrome';
import { PRODUCT_NAME } from '../shared/constants';

const SUPPORTED = [
  'صفحات الويب العادية (http وhttps) المفتوحة في تبويب نشط.',
  'النقر على الأزرار والروابط وعناصر التحكم الشائعة.',
  'الكتابة في حقول الإدخال النصية (نوع الحقل فقط، دون قيمته).',
  'اختيار قيمة من قوائم الاختيار المدعومة.',
  'لقطة شاشة تُلتقط بعد النقر مباشرة أثناء بقاء التبويب في المقدمة.',
  'التقاط نافذة أو شاشة من سطح المكتب بعد اختيارك الصريح لها في نافذة Chrome، وإضافتها كخطوات عادية.',
];

const UNSUPPORTED = [
  'صفحات المتصفح الداخلية مثل chrome:// وabout: ولوحة أدوات المطوّر.',
  'متجر Chrome الإلكتروني، لأنه محمي من عمل الإضافات داخله.',
  'الملفات المحلية المفتوحة عبر file://.',
  'الإطارات المتقاطعة المصدر داخل الصفحة (يُسجَّل ما تراه الصفحة الرئيسية فقط).',
  'مواقع تعطّل الإضافات أو تمنع أخذ لقطات الشاشة.',
  'النوافذ المحمية أو المحتوى الذي يرفضه نظام التشغيل/Chrome عند التقاط سطح المكتب.',
  'لا يوجد اختصار لوحة مفاتيح عام ولا طبقة عائمة فوق التطبيقات الأخرى؛ الالتقاط يبدأ من صفحة دليل.',
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface p-6">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {description ? (
        <p className="mt-1.5 text-[13px] leading-6 text-muted">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PrivacyApp() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-6">
          <Logo subtitle="سياسة الخصوصية وحدود التسجيل" />
          <Button variant="secondary" size="sm" onClick={() => void openLibraryPage()}>
            أدلتي المحفوظة
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        <div className="surface flex items-start gap-4 p-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-ink">بياناتك تبقى على جهازك</h1>
            <p className="mt-2 text-[13px] leading-7 text-muted">
              صُمم {PRODUCT_NAME} ليعمل بلا حساب، وبلا خادم، وبلا تتبّع. لا يرسل {PRODUCT_NAME} أي
              بيانات إلى أي جهة خارجية، وكل الأدلة واللقطات محفوظة داخل متصفحك فقط. توليد
              مستندات PDF من «استوديو PDF» عملية محلية بالكامل داخل المتصفح، ولا يُرفع أي
              محتوى أو شعار إلى خوادم.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="surface p-5">
            <WifiOff aria-hidden="true" className="size-4 text-primary" />
            <h2 className="mt-3 text-[14px] font-semibold text-ink">بلا اتصال خارجي</h2>
            <p className="mt-1.5 text-[12px] leading-6 text-muted">
              لا توجد طلبات شبكة، ولا خدمات تحليلية، ولا مكتبات تتبّع. يمكن استخدام {PRODUCT_NAME}
              دون إنترنت بعد تثبيته.
            </p>
          </div>
          <div className="surface p-5">
            <MonitorSmartphone aria-hidden="true" className="size-4 text-primary" />
            <h2 className="mt-3 text-[14px] font-semibold text-ink">تخزين محلي فقط</h2>
            <p className="mt-1.5 text-[12px] leading-6 text-muted">
              بيانات الأدلة محفوظة في <code className="text-[11px]">chrome.storage.local</code>،
              ولقطات الشاشة في قاعدة بيانات IndexedDB داخل المتصفح.
            </p>
          </div>
          <div className="surface p-5">
            <KeyRound aria-hidden="true" className="size-4 text-primary" />
            <h2 className="mt-3 text-[14px] font-semibold text-ink">لا نلمس البيانات الحساسة</h2>
            <p className="mt-1.5 text-[12px] leading-6 text-muted">
              لا يُخزَّن أي نص مكتوب في الحقول أبدًا، وخاصة حقول كلمات المرور والبطاقات وأكواد
              التحقق. يُسجَّل أن الحقل قد تم تعبئته فقط.
            </p>
          </div>
          <div className="surface p-5">
            <ImageOff aria-hidden="true" className="size-4 text-primary" />
            <h2 className="mt-3 text-[14px] font-semibold text-ink">لقطات للحقول لا تُلتقط</h2>
            <p className="mt-1.5 text-[12px] leading-6 text-muted">
              لحماية محتوى الحقول من الظهور في الصور، تُلتقط اللقطات عند النقر فقط، ولن ترى قيمة
              أي حقل داخل الدليل.
            </p>
          </div>
        </div>

        <Section
          title="ما يدعمه التسجيل"
          description="يعمل دليل بأقصى طاقته ضمن ما تسمح به واجهات Chrome."
        >
          <ul className="space-y-2.5">
            {SUPPORTED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] leading-6 text-ink">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="ما لا يدعمه التسجيل"
          description="نتعامل مع هذه الحالات بشفافية، ونحفظ الخطوة دون لقطة عند تعذّر التقاطها."
        >
          <ul className="space-y-2.5">
            {UNSUPPORTED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] leading-6 text-ink">
                <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger/80" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="الأذونات المطلوبة ولماذا">
          <dl className="space-y-4">
            <div>
              <dt className="text-[13px] font-semibold text-ink">storage</dt>
              <dd className="mt-1 text-[12px] leading-6 text-muted">
                لحفظ الأدلة واللقطات محليًا في متصفحك.
              </dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-ink">activeTab</dt>
              <dd className="mt-1 text-[12px] leading-6 text-muted">
                للتعامل مع التبويب الذي تبدأ التسجيل منه فقط، وبعد طلبك المباشر.
              </dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-ink">scripting</dt>
              <dd className="mt-1 text-[12px] leading-6 text-muted">
                لحقن كود التسجيل في التبويب المحدد عند البدء فقط. لا يُطلب أي وصول دائم لجميع
                المواقع.
              </dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-ink">desktopCapture</dt>
              <dd className="mt-1 text-[12px] leading-6 text-muted">
                لإظهار نافذة Chrome الرسمية لاختيار نافذة أو شاشة عند استخدام «التقاط من
                الكمبيوتر». لا يمنح الإضافة وصولًا تلقائيًا إلى الشاشة؛ أنت تختار المصدر في كل
                جلسة، والصور تبقى على جهازك.
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="نصائح لتسجيل أفضل">
          <ul className="space-y-2.5 text-[13px] leading-6 text-ink">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              أبقِ نافذة الموقع في المقدمة أثناء التسجيل لتُلتقط اللقطات.
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              تحرك بخطوات طبيعية؛ فالتتابع السريع جدًا قد يمنع أخذ لقطة كاملة.
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              يمكنك دائمًا إضافة أو استبدال أي لقطة يدويًا من المحرر.
            </li>
          </ul>
        </Section>

        <p className="pb-4 text-center text-[11px] text-muted">
          آخر تحديث لهذه السياسة: الإصدار 1.0 — {PRODUCT_NAME}
        </p>
      </main>
    </div>
  );
}
