import { ArrowLeft, Repeat2, Clock, Camera, BookOpen } from 'lucide-react';
import { useLang } from '../lang';

export function Problem() {
  const { strings } = useLang();
  const problem = strings.problem;
  const ICONS = [Repeat2, Clock, Camera, BookOpen];
  return (
    <section id="problem" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <p className="text-[12px] font-semibold tracking-wide text-primary">{problem.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl dark:text-slate-50">
              {problem.headline}
            </h2>
            <p className="mt-4 text-[15px] leading-8 text-muted dark:text-slate-300">{problem.lead}</p>
          </div>
          <ol className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-0">
            {problem.items.map((node, index) => (
              <li key={node.title} className="contents">
                <div className="flex-1 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary dark:bg-primary/10">
                    {(() => { const Icon = ICONS[index % ICONS.length]; return <Icon aria-hidden="true" className="size-5" />; })()}
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink dark:text-slate-100">
                    {node.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-7 text-muted dark:text-slate-400">
                    {node.text}
                  </p>
                </div>
                {index < problem.items.length - 1 ? (
                  <li
                    aria-hidden="true"
                    className="hidden flex items-center justify-center py-1 sm:flex"
                  >
                    <ArrowLeft className="size-4 text-primary/60 dark:text-primary/40" />
                  </li>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
