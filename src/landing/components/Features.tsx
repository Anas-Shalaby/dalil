import { Check } from 'lucide-react';
import { FEATURES, type Feature } from '../content';
import { RecordingMock, StepsMock } from './ProductMockup';
import { ArabicMock, EditMock, PdfMock } from './featureVisuals';

function FeatureVisual({ feature }: { feature: Feature }) {
  switch (feature.visual) {
    case 'record':
      return <RecordingMock />;
    case 'steps':
      return <StepsMock />;
    case 'edit':
      return <EditMock />;
    case 'pdf':
      return <PdfMock />;
    case 'arabic':
      return <ArabicMock />;
    default:
      return null;
  }
}

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">المميزات</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">كل ما تحتاجه لوثّق شغلك</h2>
          <p className="mt-4 text-[15px] leading-8 text-muted">
            مزيج متكامل من التسجيل والشرح والتوثيق، بلا أي خطوة زائدة عن الضرورة.
          </p>
        </div>

        <div className="mt-14 space-y-16 lg:space-y-24">
          {FEATURES.map((feature) => (
            <article
              key={feature.id}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14"
            >
              <div className={feature.reversed ? 'order-1 lg:order-2' : 'order-1 lg:order-1'}>
                <p className="text-[12px] font-semibold tracking-wide text-primary">{feature.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">{feature.title}</h3>
                <p className="mt-3 text-[15px] leading-8 text-muted">{feature.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-[14px] leading-7 text-ink">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={feature.reversed ? 'order-2 lg:order-1' : 'order-2 lg:order-2'}>
                <FeatureVisual feature={feature} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
