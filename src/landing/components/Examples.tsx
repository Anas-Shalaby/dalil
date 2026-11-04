import { FileText, Download, Eye } from "lucide-react";
import { useLang } from "../lang";

export function Examples() {
  const { strings } = useLang();
  const examples = strings.examples;

  return (
    <section
      id="examples"
      className="py-16 sm:py-24 bg-[#F8F6FE] dark:bg-slate-900/30"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-wide text-primary">
            {examples.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl dark:text-slate-50">
            {examples.headline}
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-muted dark:text-slate-300">
            {examples.description}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {examples.items.map((example) => (
            <article
              key={example.id}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all duration-200 hover:shadow-pop hover:-translate-y-1"
            >
              <div className="h-48 bg-[#DBEAFE] dark:bg-slate-800/50 flex items-center justify-center border-b border-line dark:border-slate-700 group-hover:bg-primary/10 transition-colors">
                <FileText
                  aria-hidden="true"
                  className="size-16 text-primary-ink group-hover:text-primary"
                />
              </div>
              <div className="p-6">
                <h3 className="text-[16px] font-semibold text-ink dark:text-slate-50 group-hover:text-primary">
                  {example.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-muted dark:text-slate-400 line-clamp-3">
                  {example.description}
                </p>
                <div className="mt-5 flex items-center gap-3 pt-4 border-t border-line dark:border-slate-700">
                  <a
                    href={`/dalil/dist/${example.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3 py-2 text-xs font-semibold text-primary-ink dark:border-primary/30 dark:bg-primary/10 dark:text-primary transition-colors hover:bg-primary hover:text-white"
                  >
                    <Eye aria-hidden="true" className="size-3.5" />
                    Preview
                  </a>
                  <a
                    href={`/${example.filename}`}
                    download
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Download aria-hidden="true" className="size-3.5" />
                    Download
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
