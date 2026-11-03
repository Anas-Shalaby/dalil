import { ImagePlus, Library, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { fileToLogoDataUrl } from '../pdf/logo';
import type { PdfDesignSettings, PdfPreset } from '../pdf/types';
import { Button } from '../shared/components/Button';
import { IconButton } from '../shared/components/IconButton';
import {
  ColorField,
  RangeField,
  Select,
  SettingsSection,
  TextArea,
  TextInput,
  Toggle,
} from './controls';

const FONT_OPTIONS: { value: PdfDesignSettings['fontId']; label: string }[] = [
  { value: 'plex', label: 'IBM Plex Sans Arabic' },
  { value: 'naskh', label: 'Noto Naskh Arabic (نسخ)' },
  { value: 'system', label: 'خط النظام' },
];

const STYLE_OPTIONS: { value: PdfDesignSettings['screenshotStyle']; label: string }[] = [
  { value: 'standard', label: 'إطار قياسي أنيق' },
  { value: 'framed', label: 'إطار نافذة تطبيق' },
  { value: 'full', label: 'بعرض كامل' },
  { value: 'compact', label: 'مضغوط' },
  { value: 'annotated', label: 'مع التعليقات والعلامات' },
];

const ALIGN_OPTIONS: { value: PdfDesignSettings['screenshotAlign']; label: string }[] = [
  { value: 'start', label: 'بداية الصفحة' },
  { value: 'center', label: 'وسط الصفحة' },
  { value: 'end', label: 'نهاية الصفحة' },
];

const NUMBERING_OPTIONS: { value: PdfDesignSettings['numberingStyle']; label: string }[] = [
  { value: 'badge', label: 'رقم داخل دائرة' },
  { value: 'plain', label: 'رقم بسيط' },
  { value: 'outline', label: 'رقم بإطار' },
];

export interface SettingsPanelProps {
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
  presets: PdfPreset[];
  selectedPresetId: string | null;
  presetBusy: boolean;
  onChange: (patch: Partial<PdfDesignSettings>) => void;
  onResetTemplate: () => void;
  onSelectPreset: (presetId: string | null) => void;
  onApplyPreset: () => void;
  onSavePreset: (name: string) => void;
  onUpdatePreset: () => void;
  onDeletePreset: () => void;
  onError: (message: string) => void;
}

export function SettingsPanel({
  settings,
  direction,
  presets,
  selectedPresetId,
  presetBusy,
  onChange,
  onResetTemplate,
  onSelectPreset,
  onApplyPreset,
  onSavePreset,
  onUpdatePreset,
  onDeletePreset,
  onError,
}: SettingsPanelProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      onChange({ logoDataUrl: dataUrl });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'تعذّر معالجة الشعار.');
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="divide-y divide-line">
      <SettingsSection
        title="المحتوى"
        description="بيانات تظهر في الغلاف والترويسة. لا تغيّر محتوى الدليل الأصلي."
      >
        <TextInput
          label="عنوان المستند"
          value={settings.documentTitle}
          onChange={(documentTitle) => onChange({ documentTitle })}
          maxLength={180}
        />
        <TextInput
          label="العنوان الفرعي"
          value={settings.documentSubtitle}
          onChange={(documentSubtitle) => onChange({ documentSubtitle })}
          maxLength={400}
        />
        <TextArea
          label="وصف المستند"
          value={settings.documentDescription}
          onChange={(documentDescription) => onChange({ documentDescription })}
          maxLength={900}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            label="إعداد"
            value={settings.author}
            onChange={(author) => onChange({ author })}
            maxLength={120}
          />
          <TextInput
            label="الجهة"
            value={settings.company}
            onChange={(company) => onChange({ company })}
            maxLength={120}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="pdf-date"
              className="mb-1.5 block text-[11.5px] font-medium text-ink"
            >
              التاريخ
            </label>
            <input
              id="pdf-date"
              type="date"
              value={settings.documentDate}
              onChange={(event) => onChange({ documentDate: event.target.value })}
              className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-[12px] text-ink outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <TextInput
            label="ملاحظة"
            value={settings.metadataNote}
            onChange={(metadataNote) => onChange({ metadataNote })}
            maxLength={240}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="الهوية"
        description="الشعار والألوان تُطبَّق على كل الصفحات."
        action={
          <button
            type="button"
            onClick={onResetTemplate}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] text-muted transition-colors hover:bg-[#F3F0FA] hover:text-primary"
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            استعادة القالب
          </button>
        }
      >
        <div className="flex items-center gap-3 rounded-xl border border-line bg-[#FBFAFE] p-2.5">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
            {settings.logoDataUrl ? (
              <img
                src={settings.logoDataUrl}
                alt="شعار الجهة"
                className="max-h-10 max-w-[52px] object-contain"
              />
            ) : (
              <ImagePlus aria-hidden="true" className="size-4 text-muted" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-ink">
              {settings.logoDataUrl ? 'شعار مخصص' : 'لا يوجد شعار'}
            </p>
            <p className="text-[10px] leading-4 text-muted">
              PNG أو JPG أو WebP · حتى 1 ميجابايت، وتُعالج محليًا.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void handleLogo(event)}
              aria-label="رفع شعار الجهة"
            />
            <IconButton
              label={settings.logoDataUrl ? 'استبدال الشعار' : 'رفع شعار'}
              variant="default"
              size="sm"
              disabled={logoBusy}
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload aria-hidden="true" className="size-3.5" />
            </IconButton>
            {settings.logoDataUrl ? (
              <IconButton
                label="إزالة الشعار"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ logoDataUrl: null })}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </IconButton>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ColorField
            label="أساسي"
            value={settings.primaryColor}
            onChange={(primaryColor) => onChange({ primaryColor })}
          />
          <ColorField
            label="ثانوي"
            value={settings.secondaryColor}
            onChange={(secondaryColor) => onChange({ secondaryColor })}
          />
          <ColorField
            label="مميز"
            value={settings.accentColor}
            onChange={(accentColor) => onChange({ accentColor })}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="الخط" description="النص العربي يُصدَّر كصورة عالية الدقة.">
        <Select
          label="الخط"
          value={settings.fontId}
          options={FONT_OPTIONS}
          onChange={(fontId) => onChange({ fontId })}
        />
        <RangeField
          label="حجم النص الأساسي"
          value={settings.baseFontSize}
          min={9}
          max={16}
          step={0.5}
          suffix=" pt"
          onChange={(baseFontSize) => onChange({ baseFontSize })}
        />
        <RangeField
          label="تباعد الأسطر"
          value={settings.lineHeight}
          min={1.35}
          max={2.2}
          step={0.05}
          onChange={(lineHeight) => onChange({ lineHeight })}
        />
        <Select
          label="اتجاه المستند"
          value={settings.direction}
          options={[
            { value: 'auto', label: 'تلقائي حسب المحتوى' },
            { value: 'rtl', label: 'من اليمين إلى اليسار' },
            { value: 'ltr', label: 'من اليسار إلى اليمين' },
          ]}
          onChange={(next) => onChange({ direction: next })}
          hint={`الاتجاه المطبّق الآن: ${direction === 'rtl' ? 'RTL' : 'LTR'}`}
        />
      </SettingsSection>

      <SettingsSection title="الصفحة">
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="مقاس الورق"
            value={settings.pageSize}
            options={[
              { value: 'a4', label: 'A4 · 210×297' },
              { value: 'letter', label: 'Letter · 8.5×11' },
            ]}
            onChange={(pageSize) => onChange({ pageSize })}
          />
          <Select
            label="الاتجاه"
            value={settings.orientation}
            options={[
              { value: 'portrait', label: 'طولي' },
              { value: 'landscape', label: 'عرضي' },
            ]}
            onChange={(orientation) => onChange({ orientation })}
          />
        </div>
        <RangeField
          label="الهوامش"
          value={settings.marginMm}
          min={10}
          max={30}
          suffix=" مم"
          onChange={(marginMm) => onChange({ marginMm })}
        />
        <RangeField
          label="التباعد بين الخطوات"
          value={settings.stepSpacing}
          min={0}
          max={16}
          suffix=" px"
          onChange={(stepSpacing) => onChange({ stepSpacing })}
        />
      </SettingsSection>

      <SettingsSection title="اللقطات">
        <Select
          label="نمط عرض اللقطات"
          value={settings.screenshotStyle}
          options={STYLE_OPTIONS}
          onChange={(screenshotStyle) => onChange({ screenshotStyle })}
        />
        <RangeField
          label="عرض اللقطة"
          value={settings.screenshotWidthPercent}
          min={35}
          max={100}
          suffix="٪"
          onChange={(screenshotWidthPercent) => onChange({ screenshotWidthPercent })}
        />
        <Select
          label="محاذاة اللقطة"
          value={settings.screenshotAlign}
          options={ALIGN_OPTIONS}
          onChange={(screenshotAlign) => onChange({ screenshotAlign })}
        />
        <RangeField
          label="استدارة الزوايا"
          value={settings.screenshotRadius}
          min={0}
          max={20}
          suffix=" px"
          onChange={(screenshotRadius) => onChange({ screenshotRadius })}
        />
        <Select
          label="نمط ترقيم الخطوات"
          value={settings.numberingStyle}
          options={NUMBERING_OPTIONS}
          onChange={(numberingStyle) => onChange({ numberingStyle })}
        />
      </SettingsSection>

      <SettingsSection title="الترويسة والتذييل">
        <Toggle
          label="إظهار الترويسة"
          checked={settings.showHeader}
          onChange={(showHeader) => onChange({ showHeader })}
        />
        {settings.showHeader ? (
          <div className="space-y-2 rounded-lg border border-line bg-[#FBFAFE] p-2.5">
            <Toggle
              label="عنوان المستند"
              checked={settings.showHeaderTitle}
              onChange={(showHeaderTitle) => onChange({ showHeaderTitle })}
            />
            <Toggle
              label="الشعار"
              checked={settings.showHeaderLogo}
              onChange={(showHeaderLogo) => onChange({ showHeaderLogo })}
            />
          </div>
        ) : null}
        <Toggle
          label="إظهار التذييل"
          checked={settings.showFooter}
          onChange={(showFooter) => onChange({ showFooter })}
        />
        {settings.showFooter ? (
          <div className="space-y-2 rounded-lg border border-line bg-[#FBFAFE] p-2.5">
            <Toggle
              label="رقم الصفحة"
              checked={settings.showPageNumber}
              onChange={(showPageNumber) => onChange({ showPageNumber })}
            />
            <Toggle
              label="اسم الجهة"
              checked={settings.showFooterCompany}
              onChange={(showFooterCompany) => onChange({ showFooterCompany })}
            />
            <TextInput
              label="نص تذييل مخصص"
              value={settings.footerText}
              onChange={(footerText) => onChange({ footerText })}
              maxLength={240}
            />
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection title="الغلاف">
        <Toggle
          label="إظهار صفحة الغلاف"
          checked={settings.showCover}
          onChange={(showCover) => onChange({ showCover })}
        />
        {settings.showCover ? (
          <>
            <Select
              label="تخطيط الغلاف"
              value={settings.coverLayout}
              options={[
                { value: 'template', label: 'تخطيط القالب' },
                { value: 'centered', label: 'غلاف مركزي' },
                { value: 'split', label: 'غلاف منقسم' },
              ]}
              onChange={(coverLayout) => onChange({ coverLayout })}
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-line bg-[#FBFAFE] p-2.5">
              <Toggle
                label="العنوان"
                checked={settings.coverShowTitle}
                onChange={(coverShowTitle) => onChange({ coverShowTitle })}
              />
              <Toggle
                label="العنوان الفرعي"
                checked={settings.coverShowSubtitle}
                onChange={(coverShowSubtitle) => onChange({ coverShowSubtitle })}
              />
              <Toggle
                label="الشعار"
                checked={settings.coverShowLogo}
                onChange={(coverShowLogo) => onChange({ coverShowLogo })}
              />
              <Toggle
                label="إعداد"
                checked={settings.coverShowAuthor}
                onChange={(coverShowAuthor) => onChange({ coverShowAuthor })}
              />
              <Toggle
                label="الجهة"
                checked={settings.coverShowCompany}
                onChange={(coverShowCompany) => onChange({ coverShowCompany })}
              />
              <Toggle
                label="التاريخ"
                checked={settings.coverShowDate}
                onChange={(coverShowDate) => onChange({ coverShowDate })}
              />
            </div>
          </>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="الإعدادات المحفوظة"
        description="تُحفظ إعدادات التصميم فقط، دون محتوى الدليل."
      >
        <div className="flex items-center gap-2">
          <Library aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
          <select
            aria-label="مظهر محفوظ"
            value={selectedPresetId ?? ''}
            onChange={(event) => onSelectPreset(event.target.value || null)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[11.5px] text-ink outline-none focus:border-primary/50"
          >
            <option value="">— اختر مظهرًا محفوظًا —</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="soft"
            size="sm"
            disabled={!selectedPresetId || presetBusy}
            onClick={onApplyPreset}
          >
            تحميل
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedPresetId || presetBusy}
            onClick={onUpdatePreset}
          >
            <Save aria-hidden="true" className="size-3" />
            تحديث
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!selectedPresetId || presetBusy}
            onClick={onDeletePreset}
          >
            <Trash2 aria-hidden="true" className="size-3" />
            حذف
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={presetName}
            maxLength={60}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="اسم المظهر الجديد"
            aria-label="اسم المظهر الجديد"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[11.5px] text-ink outline-none placeholder:text-muted/70 focus:border-primary/50"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!presetName.trim() || presetBusy}
            onClick={() => {
              onSavePreset(presetName);
              setPresetName('');
            }}
          >
            حفظ
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
