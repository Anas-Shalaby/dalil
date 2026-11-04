import { Check } from 'lucide-react';
import { RecordingMock, StepsMock } from './ProductMockup';
import { ArabicMock, EditMock, PdfMock } from './featureVisuals';
import { useLang } from '../lang';

interface FeaturesProps {
  t: (path: string) => string;
}

function FeatureVisual({ feature, t }: { feature: { visual: string; reversed?: boolean; id: string; eyebrow: string; title: string; description: string; points: string[] }; t?: (path: string) => string }) {
  switch (feature.visual) {
    case 'record':
      return <RecordingMock t={t} />;
    case 'steps':
      return <StepsMock t={t} />;
    case 'edit':
      return <EditMock t={t} />;
    case 'pdf':
      return <PdfMock />;
    case 'arabic':
      return <ArabicMock />;
    default:
      return null;
  }
}

export function Features({ t }: FeaturesProps) {
  const { strings } = useLang();
  const features = strings.features;
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">{features.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl dark:text-slate-50">
            {features.headline}
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-muted dark:text-slate-300">
            {features.description}
          </p>
        </div>

        <div className="mt-14 space-y-16 lg:space-y-24">
          {features.items.map((feature) => (
            <article
              key={feature.id}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14"
            >
              <div className={feature.reversed ? 'order-2 lg:order-2' : 'order-1 lg:order-1'}>
                <p className="text-[12px] font-semibold tracking-wide text-primary">{feature.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl dark:text-slate-50">
                  {feature.title}
                </h3>
                <p className="mt-3 text-[15px] leading-8 text-muted dark:text-slate-300">
                  {feature.description}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-[14px] leading-7 text-ink dark:text-slate-100">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={feature.reversed ? 'order-1 lg:order-1' : 'order-2 lg:order-2'}>
                <FeatureVisual feature={feature} t={t} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
