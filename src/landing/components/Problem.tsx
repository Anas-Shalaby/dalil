import { Fragment } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PROBLEM } from '../content';

export function Problem() {
  const nodes = PROBLEM.flow;

  return (
    <section id="problem" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <p className="text-[12px] font-semibold tracking-wide text-primary">{PROBLEM.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">{PROBLEM.headline}</h2>
            <p className="mt-4 text-[15px] leading-8 text-muted">{PROBLEM.lead}</p>
          </div>
          <ol className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-0">
            {nodes.map((node, index) => (
              <Fragment key={node.title}>
                <li className="flex-1 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <node.icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{node.title}</h3>
                  <p className="mt-2 text-[13px] leading-7 text-muted">{node.text}</p>
                </li>
                {index < nodes.length - 1 ? (
                  <li aria-hidden="true" className="hidden flex items-center justify-center py-1 sm:flex">
                    <ArrowLeft className="size-4 text-primary/60" />
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
