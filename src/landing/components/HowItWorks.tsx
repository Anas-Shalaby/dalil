import { HOW_IT_WORKS } from '../content';

export function HowItWorks() {
  return (
    <section id="how" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">كيف نعمل</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">ثلاث خطوات، دليل جاهز</h2>
          <p className="mt-4 text-[15px] leading-8 text-muted">
            من أول تفاعل مع الموقع لحد ما يكون الدليل جاهزًا للمشاركة — وبطء يفوقك بخطوات.
          </p>
        </div>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-line bg-surface p-6 shadow-card"
            >
              <span className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <step.icon aria-hidden="true" className="size-5" />
                </span>
                <span className="text-4xl font-semibold text-[#F1ECFF]">{String(index + 1).padStart(2, '0')}</span>
              </span>
              <h3 className="mt-5 text-[17px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-[14px] leading-7 text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
