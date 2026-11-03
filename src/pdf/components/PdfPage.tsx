import { forwardRef, memo, type CSSProperties } from 'react';
import { AnnotatedImage } from '../../shared/components/AnnotatedImage';
import { PDF_FONT_STACKS } from '../settings';
import type {
  PdfContentPage,
  PdfCoverPage,
  PdfDesignSettings,
  PdfPageGeometry,
  PdfPagePlan,
  PdfStepBlock,
} from '../types';

interface PdfPageProps {
  page: PdfPagePlan;
  settings: PdfDesignSettings;
  geometry: PdfPageGeometry;
  direction: 'rtl' | 'ltr';
  eagerImages?: boolean;
  pageIndex: number;
}

function formatPdfDate(value: string, direction: 'rtl' | 'ltr'): string {
  if (!value) return '';
  try {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(direction === 'rtl' ? 'ar' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return value;
  }
}

function PageLogo({ settings, className }: { settings: PdfDesignSettings; className?: string }) {
  if (!settings.logoDataUrl) return null;
  return (
    <img
      src={settings.logoDataUrl}
      alt={settings.company || 'شعار الجهة'}
      className={className ?? 'pdf-logo'}
      decoding="sync"
    />
  );
}

function StepImage({
  block,
  settings,
  eagerImages,
}: {
  block: PdfStepBlock;
  settings: PdfDesignSettings;
  eagerImages: boolean;
}) {
  if (!block.image) return null;
  const hasAnnotations = Boolean(block.image.annotations?.length);
  const style = settings.screenshotStyle;
  const caption = block.caption;
  return (
    <div
      className={[
        'pdf-shot-wrap',
        `pdf-shot-wrap--${style}`,
        `pdf-shot-align--${settings.screenshotAlign}`,
      ].join(' ')}
    >
      <figure
        className="pdf-shot"
        style={{
          width: `${block.image.widthPx}px`,
          borderRadius: `${settings.screenshotRadius}px`,
        }}
      >
        {style === 'framed' ? (
          <div className="pdf-shot-chrome" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        <div
          className="pdf-shot-media"
          style={{ height: `${block.image.heightPx}px` }}
        >
          {hasAnnotations && block.image.annotations ? (
            <AnnotatedImage
              src={block.image.dataUrl}
              annotations={block.image.annotations}
              alt={`لقطة الشاشة للخطوة ${block.stepNumber}`}
              className="pdf-shot-canvas"
            />
          ) : (
            <img
              src={block.image.dataUrl}
              alt={`لقطة الشاشة للخطوة ${block.stepNumber}`}
              loading={eagerImages ? 'eager' : 'lazy'}
              decoding="sync"
              className="pdf-shot-img"
            />
          )}
        </div>
        {style === 'annotated' && hasAnnotations ? (
          <span className="pdf-shot-annotated-badge">مع التعليقات</span>
        ) : null}
      </figure>
      {caption ? <figcaption className="pdf-shot-caption">{caption}</figcaption> : null}
    </div>
  );
}

function StepHeading({
  block,
  settings,
}: {
  block: PdfStepBlock;
  settings: PdfDesignSettings;
}) {
  const numberClass = `pdf-step-number pdf-step-number--${settings.numberingStyle}`;
  if (!block.showHeading) {
    return (
      <p className="pdf-continued">
        تكملة الخطوة <span className={numberClass}>{block.stepNumber}</span>
      </p>
    );
  }
  return (
    <div className="pdf-step-head">
      <span className={numberClass}>{block.stepNumber}</span>
      <span className="pdf-step-eyebrow">الخطوة {block.stepNumber}</span>
    </div>
  );
}

const StepBlockView = memo(function StepBlockView({
  block,
  settings,
  eagerImages,
}: {
  block: PdfStepBlock;
  settings: PdfDesignSettings;
  eagerImages: boolean;
}) {
  return (
    <section className="pdf-step" data-step-id={block.stepId}>
      <StepHeading block={block} settings={settings} />
      {block.text ? <p className="pdf-step-text">{block.text}</p> : null}
      <StepImage block={block} settings={settings} eagerImages={eagerImages} />
    </section>
  );
});

function ContentBody({
  page,
  settings,
  eagerImages,
}: {
  page: PdfContentPage;
  settings: PdfDesignSettings;
  eagerImages: boolean;
}) {
  return (
    <div className="pdf-content-body">
      {page.blocks.map((block, index) =>
        block.kind === 'empty' ? (
          <div className="pdf-empty" key="empty">
            <span className="pdf-empty-mark" aria-hidden="true">
              —
            </span>
            <p>لا توجد خطوات في هذا الدليل.</p>
          </div>
        ) : (
          <StepBlockView
            key={`${block.stepId}-${block.continued ? 'c' : 's'}-${index}`}
            block={block}
            settings={settings}
            eagerImages={eagerImages}
          />
        ),
      )}
    </div>
  );
}

function PageHeader({
  settings,
  page,
}: {
  settings: PdfDesignSettings;
  page: PdfContentPage;
}) {
  if (!settings.showHeader) return null;
  return (
    <header className="pdf-header">
      <div className="pdf-header-start">
        {settings.showHeaderLogo ? <PageLogo settings={settings} className="pdf-header-logo" /> : null}
        {settings.showHeaderTitle ? (
          <span className="pdf-header-title">{settings.documentTitle}</span>
        ) : null}
      </div>
      <div className="pdf-header-end">
        <span className="pdf-header-kicker">
          {settings.company || (settings.templateId === 'technical' ? 'DOCUMENT' : 'دليل')}
        </span>
        {page.pageNumber !== null ? (
          <span className="pdf-header-page">
            {String(page.pageNumber).padStart(2, '0')} /{' '}
            {String(page.totalPages).padStart(2, '0')}
          </span>
        ) : null}
      </div>
    </header>
  );
}

function PageFooter({
  settings,
  page,
}: {
  settings: PdfDesignSettings;
  page: PdfContentPage;
}) {
  if (!settings.showFooter) return null;
  return (
    <footer className="pdf-footer">
      <div className="pdf-footer-start">
        {settings.showFooterCompany && settings.company ? (
          <span className="pdf-footer-company">{settings.company}</span>
        ) : null}
        {settings.footerText ? <span className="pdf-footer-text">{settings.footerText}</span> : null}
      </div>
      {settings.showPageNumber && page.pageNumber !== null ? (
        <span className="pdf-footer-page">{page.pageNumber}</span>
      ) : null}
    </footer>
  );
}

function CoverMeta({
  settings,
  direction,
  align = 'start',
}: {
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
  align?: 'start' | 'center';
}) {
  const items: Array<{ label: string; value: string }> = [];
  if (settings.coverShowAuthor && settings.author) {
    items.push({ label: 'إعداد', value: settings.author });
  }
  if (settings.coverShowCompany && settings.company) {
    items.push({ label: 'الجهة', value: settings.company });
  }
  if (settings.coverShowDate && settings.documentDate) {
    items.push({ label: 'التاريخ', value: formatPdfDate(settings.documentDate, direction) });
  }
  if (items.length === 0 && !settings.metadataNote) return null;
  return (
    <div className={`pdf-cover-meta pdf-cover-meta--${align}`}>
      {items.map((item) => (
        <div className="pdf-cover-meta-item" key={item.label}>
          <span className="pdf-cover-meta-label">{item.label}</span>
          <span className="pdf-cover-meta-value">{item.value}</span>
        </div>
      ))}
      {settings.metadataNote ? (
        <p className="pdf-cover-note">{settings.metadataNote}</p>
      ) : null}
    </div>
  );
}

function CenteredCover({
  settings,
  direction,
}: {
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
}) {
  return (
    <div className="pdf-cover pdf-cover--centered">
      <div className="pdf-cover-ornament pdf-cover-ornament--top" aria-hidden="true" />
      <div className="pdf-cover-centered-inner">
        {settings.coverShowLogo ? <PageLogo settings={settings} className="pdf-cover-logo" /> : null}
        <p className="pdf-cover-kicker">{settings.company || 'دليل'}</p>
        {settings.coverShowTitle ? <h1 className="pdf-cover-title">{settings.documentTitle}</h1> : null}
        {settings.coverShowSubtitle && settings.documentSubtitle ? (
          <p className="pdf-cover-subtitle">{settings.documentSubtitle}</p>
        ) : null}
        <div className="pdf-cover-rule" aria-hidden="true" />
        {settings.documentDescription && settings.documentDescription !== settings.documentSubtitle ? (
          <p className="pdf-cover-description">{settings.documentDescription}</p>
        ) : null}
        <CoverMeta settings={settings} direction={direction} align="center" />
      </div>
      <div className="pdf-cover-ornament pdf-cover-ornament--bottom" aria-hidden="true" />
    </div>
  );
}

function SplitCover({
  settings,
  direction,
}: {
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
}) {
  return (
    <div className="pdf-cover pdf-cover--split">
      <div className="pdf-cover-split-aside">
        <div className="pdf-cover-split-brand">
          {settings.coverShowLogo ? <PageLogo settings={settings} className="pdf-cover-logo" /> : null}
          <span className="pdf-cover-kicker">{settings.company || 'دليل'}</span>
        </div>
        <div className="pdf-cover-split-meta">
          {settings.coverShowDate && settings.documentDate ? (
            <span>{formatPdfDate(settings.documentDate, direction)}</span>
          ) : null}
          {settings.coverShowAuthor && settings.author ? <span>{settings.author}</span> : null}
        </div>
      </div>
      <div className="pdf-cover-split-main">
        <p className="pdf-cover-kicker">دليل خطوات</p>
        {settings.coverShowTitle ? <h1 className="pdf-cover-title">{settings.documentTitle}</h1> : null}
        {settings.coverShowSubtitle && settings.documentSubtitle ? (
          <p className="pdf-cover-subtitle">{settings.documentSubtitle}</p>
        ) : null}
        {settings.documentDescription && settings.documentDescription !== settings.documentSubtitle ? (
          <p className="pdf-cover-description">{settings.documentDescription}</p>
        ) : null}
        {settings.metadataNote ? <p className="pdf-cover-note">{settings.metadataNote}</p> : null}
      </div>
    </div>
  );
}

function TemplateCover({
  settings,
  direction,
}: {
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
}) {
  if (settings.templateId === 'minimal') {
    return (
      <div className="pdf-cover pdf-cover--minimal">
        <div className="pdf-cover-minimal-top">
          {settings.coverShowLogo ? <PageLogo settings={settings} className="pdf-cover-logo" /> : null}
          <span className="pdf-cover-kicker">{settings.company || 'دليل'}</span>
        </div>
        <div className="pdf-cover-minimal-body">
          {settings.coverShowTitle ? <h1 className="pdf-cover-title">{settings.documentTitle}</h1> : null}
          {settings.coverShowSubtitle && settings.documentSubtitle ? (
            <p className="pdf-cover-subtitle">{settings.documentSubtitle}</p>
          ) : null}
        </div>
        <CoverMeta settings={settings} direction={direction} />
      </div>
    );
  }

  if (settings.templateId === 'technical') {
    return (
      <div className="pdf-cover pdf-cover--technical">
        <div className="pdf-cover-tech-grid" aria-hidden="true" />
        <div className="pdf-cover-tech-top">
          <span className="pdf-cover-kicker">DOCUMENTATION / دليل</span>
          {settings.coverShowLogo ? <PageLogo settings={settings} className="pdf-cover-logo" /> : null}
        </div>
        <div className="pdf-cover-tech-body">
          {settings.coverShowTitle ? <h1 className="pdf-cover-title">{settings.documentTitle}</h1> : null}
          {settings.coverShowSubtitle && settings.documentSubtitle ? (
            <p className="pdf-cover-subtitle">{settings.documentSubtitle}</p>
          ) : null}
          <div className="pdf-cover-tech-table">
            {settings.coverShowCompany && settings.company ? (
              <div>
                <span>ORG</span>
                <strong>{settings.company}</strong>
              </div>
            ) : null}
            {settings.coverShowAuthor && settings.author ? (
              <div>
                <span>AUTHOR</span>
                <strong>{settings.author}</strong>
              </div>
            ) : null}
            {settings.coverShowDate && settings.documentDate ? (
              <div>
                <span>DATE</span>
                <strong>{formatPdfDate(settings.documentDate, direction)}</strong>
              </div>
            ) : null}
            <div>
              <span>STEPS</span>
              <strong>{settings.metadataNote || '—'}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (settings.templateId === 'gradient') {
    return (
      <div className="pdf-cover pdf-cover--gradient">
        <div className="pdf-cover-gradient-orb pdf-cover-gradient-orb--one" aria-hidden="true" />
        <div className="pdf-cover-gradient-orb pdf-cover-gradient-orb--two" aria-hidden="true" />
        <div className="pdf-cover-gradient-inner">
          <div className="pdf-cover-gradient-top">
            {settings.coverShowLogo ? <PageLogo settings={settings} className="pdf-cover-logo" /> : null}
            <span className="pdf-cover-kicker">{settings.company || 'دليل'}</span>
          </div>
          {settings.coverShowTitle ? <h1 className="pdf-cover-title">{settings.documentTitle}</h1> : null}
          {settings.coverShowSubtitle && settings.documentSubtitle ? (
            <p className="pdf-cover-subtitle">{settings.documentSubtitle}</p>
          ) : null}
          {settings.documentDescription && settings.documentDescription !== settings.documentSubtitle ? (
            <p className="pdf-cover-description">{settings.documentDescription}</p>
          ) : null}
          <CoverMeta settings={settings} direction={direction} />
        </div>
      </div>
    );
  }

  if (settings.templateId === 'tutorial') {
    return (
      <div className="pdf-cover pdf-cover--tutorial">
        <div className="pdf-cover-tutorial-band">
          <span className="pdf-cover-kicker">دليل تعليمي</span>
          {settings.coverShowLogo ? <PageLogo settings={settings} className="pdf-cover-logo" /> : null}
        </div>
        <div className="pdf-cover-tutorial-body">
          {settings.coverShowTitle ? <h1 className="pdf-cover-title">{settings.documentTitle}</h1> : null}
          {settings.coverShowSubtitle && settings.documentSubtitle ? (
            <p className="pdf-cover-subtitle">{settings.documentSubtitle}</p>
          ) : null}
          <div className="pdf-cover-tutorial-goal">
            <span aria-hidden="true">◎</span>
            <p>{settings.documentDescription || 'اتبع الخطوات بالترتيب للوصول إلى النتيجة.'}</p>
          </div>
          <CoverMeta settings={settings} direction={direction} />
        </div>
      </div>
    );
  }

  if (settings.templateId === 'brand') {
    return (
      <div className="pdf-cover pdf-cover--brand">
        <div className="pdf-cover-brand-band" aria-hidden="true" />
        <div className="pdf-cover-brand-inner">
          <div className="pdf-cover-brand-top">
            {settings.coverShowLogo ? <PageLogo settings={settings} className="pdf-cover-logo" /> : null}
            <span className="pdf-cover-kicker">{settings.company || 'هوية العلامة'}</span>
          </div>
          {settings.coverShowTitle ? <h1 className="pdf-cover-title">{settings.documentTitle}</h1> : null}
          {settings.coverShowSubtitle && settings.documentSubtitle ? (
            <p className="pdf-cover-subtitle">{settings.documentSubtitle}</p>
          ) : null}
          {settings.documentDescription && settings.documentDescription !== settings.documentSubtitle ? (
            <p className="pdf-cover-description">{settings.documentDescription}</p>
          ) : null}
          <CoverMeta settings={settings} direction={direction} />
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-cover pdf-cover--executive">
      <div className="pdf-cover-executive-rule" aria-hidden="true" />
      <div className="pdf-cover-executive-inner">
        <div className="pdf-cover-executive-top">
          {settings.coverShowLogo ? <PageLogo settings={settings} className="pdf-cover-logo" /> : null}
          <span className="pdf-cover-kicker">{settings.company || 'دليل'}</span>
        </div>
        <div className="pdf-cover-executive-main">
          {settings.coverShowTitle ? <h1 className="pdf-cover-title">{settings.documentTitle}</h1> : null}
          {settings.coverShowSubtitle && settings.documentSubtitle ? (
            <p className="pdf-cover-subtitle">{settings.documentSubtitle}</p>
          ) : null}
          {settings.documentDescription && settings.documentDescription !== settings.documentSubtitle ? (
            <p className="pdf-cover-description">{settings.documentDescription}</p>
          ) : null}
        </div>
        <CoverMeta settings={settings} direction={direction} />
      </div>
      <div className="pdf-cover-executive-bottom" aria-hidden="true" />
    </div>
  );
}

function CoverPage({
  page,
  settings,
  direction,
}: {
  page: PdfCoverPage;
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
}) {
  const layout = settings.coverLayout;
  return (
    <div className="pdf-cover-shell" data-page-number={page.pageNumber ?? ''}>
      {layout === 'centered' ? (
        <CenteredCover settings={settings} direction={direction} />
      ) : layout === 'split' ? (
        <SplitCover settings={settings} direction={direction} />
      ) : (
        <TemplateCover settings={settings} direction={direction} />
      )}
    </div>
  );
}

export const PdfDocumentPage = memo(
  forwardRef<HTMLDivElement, PdfPageProps>(function PdfDocumentPage(
    { page, settings, geometry, direction, eagerImages = false, pageIndex },
    ref,
  ) {
    const style = {
      width: `${geometry.widthPx}px`,
      height: `${geometry.heightPx}px`,
      '--pdf-primary': settings.primaryColor,
      '--pdf-secondary': settings.secondaryColor,
      '--pdf-accent': settings.accentColor,
      '--pdf-font': PDF_FONT_STACKS[settings.fontId],
      '--pdf-base': `${geometry.baseFontSizePx}px`,
      '--pdf-line': `${geometry.lineHeightPx}px`,
      '--pdf-margin': `${geometry.marginPx}px`,
      '--pdf-header-h': `${geometry.headerHeightPx}px`,
      '--pdf-footer-h': `${geometry.footerHeightPx}px`,
      '--pdf-radius': `${settings.screenshotRadius}px`,
      '--pdf-gap': `${settings.stepSpacing}px`,
      '--pdf-page-width-mm': `${geometry.widthMm}mm`,
      '--pdf-page-height-mm': `${geometry.heightMm}mm`,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        className={`pdf-page pdf-page--${settings.templateId} pdf-page--${page.kind}`}
        style={style}
        dir={direction}
        data-pdf-page={pageIndex}
        data-page-kind={page.kind}
      >
        {page.kind === 'cover' ? (
          <CoverPage page={page} settings={settings} direction={direction} />
        ) : (
          <>
            <PageHeader settings={settings} page={page} />
            <div className="pdf-body">
              <ContentBody page={page} settings={settings} eagerImages={eagerImages} />
            </div>
            <PageFooter settings={settings} page={page} />
          </>
        )}
      </div>
    );
  }),
);
