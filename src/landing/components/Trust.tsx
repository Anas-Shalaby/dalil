import { TRUST_ITEMS } from '../content';

export function Trust() {
  return (
    <section id="trust" className="py-10 sm:py-14" aria-labelledby="trust-title">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="surface flex flex-col gap-8 rounded-3xl bg-[#F1ECFF]/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:p-10">
          <div className="max-w-xl">
            <p className="text-[12px] font-semibold tracking-wide text-primary">لماذا الناس تثق في دليل؟</p>
            <h2 id="trust-title" className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">
              ثقة قبل أي سؤال
            </h2>
            <p className="mt-3 text-[15px] leading-8 text-muted">
              دليل صُمم يشتغل من غير حساب، ومن غير خادم، ومن دون ما يرسل لك أي محتوى أو بيانات
              خارج المتصفح. هكذا يبقى التركيز على الفائدة، لا على الخوف.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {TRUST_ITEMS.map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:min-w-[150px]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <item.icon aria-hidden="true" className="size-4" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{item.title}</span>
                  <span className="mt-1 block text-[12px] leading-6 text-muted">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
