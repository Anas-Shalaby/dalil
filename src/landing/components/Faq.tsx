import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '../content';

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">الأسئلة الشائعة</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">كل ما تحتاج معرفته</h2>
          <p className="mt-4 text-[15px] leading-8 text-muted">
            أجوبة مختصرة، بدون تعقيد. وإذا ما عجبك شيء، راسلنا من خلال الإضافة.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.question} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-[15px] font-semibold text-ink transition-colors hover:bg-[#FBFAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-6"
                  aria-expanded={open}
                  aria-controls={`faq-answer-${index}`}
                  id={`faq-question-${index}`}
                  onClick={() => toggle(index)}
                >
                  {item.question}
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-5 shrink-0 text-primary transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open ? (
                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-question-${index}`}
                    className="border-t border-line px-5 pb-5 sm:px-6"
                  >
                    <p className="pt-4 text-[14px] leading-8 text-muted">{item.answer}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
