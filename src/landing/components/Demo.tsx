import { useState } from 'react';
import { Globe } from 'lucide-react';
import { AnnotatedScreenshot } from './ProductMockup';
import { DEMO_STEPS } from '../content';

export function Demo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, DEMO_STEPS.length - 1);
  const activeStep = DEMO_STEPS[safeIndex];

  const selectStep = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <section id="demo" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-primary">العرض التفاعلي</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">جرّب كيف يشوف دليلك</h2>
            <p className="mt-4 text-[15px] leading-8 text-muted">
              اختر خطوة من الدليل وشاهد كيف يتغير الشرح والتركيز مع كل خطوة — بدل ما تشرح نفس
              الخطوة كل مرة.
            </p>
            <ol className="mt-8 space-y-2.5">
              {DEMO_STEPS.map((step, index) => (
                <li key={step.id}>
                  <button
                    type="button"
                    aria-pressed={index === safeIndex}
                    onClick={() => selectStep(index)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-start text-[14px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      index === safeIndex
                        ? 'border-primary/40 bg-primary-soft text-primary-ink'
                        : 'border-line bg-surface text-ink hover:border-primary/30'
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                        index === safeIndex ? 'bg-primary text-white' : 'bg-[#F1ECFF] text-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                    {step.title}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-[#43218C]/15">
              <div className="flex items-center gap-2.5 border-b border-line bg-canvas px-3 py-2.5 sm:px-4">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-[#E4DAFC]" />
                  <span className="size-2.5 rounded-full bg-[#E4DAFC]" />
                  <span className="size-2.5 rounded-full bg-[#E4DAFC]" />
                </span>
                <span className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] text-muted">
                  <Globe aria-hidden="true" className="size-3" />
                  app.example.com/dashboard
                </span>
              </div>
              <div className="bg-[#F8F6FE] p-3 sm:p-4">
                <AnnotatedScreenshot label={activeStep.annotationLabel} highlighted />
                <div className="mt-3 rounded-xl border border-line bg-white p-4">
                  <p className="text-[13px] font-semibold text-ink">{activeStep.title}</p>
                  <p className="mt-1.5 text-[12px] leading-7 text-muted">{activeStep.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
