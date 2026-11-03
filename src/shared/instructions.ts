import type { ActionType, ElementKind } from './types';

interface InstructionOptions {
  kind?: ElementKind;
  checked?: boolean;
}

export function buildInstruction(
  actionType: ActionType,
  rawLabel: string,
  options: InstructionOptions = {},
): string {
  const label = rawLabel.trim();
  const quoted = label ? `«${label}»` : '';

  switch (actionType) {
    case 'click':
      if (options.kind === 'button') {
        return label ? `اضغط على زر ${quoted}.` : 'اضغط على الزر المحدد.';
      }
      if (options.kind === 'link') {
        return label ? `افتح رابط ${quoted}.` : 'افتح الرابط المحدد.';
      }
      if (options.kind === 'tab') {
        return label ? `افتح تبويب ${quoted}.` : 'افتح التبويب المحدد.';
      }
      if (options.kind === 'menuitem') {
        return label ? `اختر ${quoted} من القائمة.` : 'اختر عنصرًا من القائمة.';
      }
      return label ? `اضغط على ${quoted}.` : 'تفاعل مع العنصر المحدد.';
    case 'input':
      return label
        ? `أدخل البيانات في حقل ${quoted}.`
        : 'أدخل البيانات في الحقل المحدد.';
    case 'select':
      return label
        ? `اختر خيارًا من قائمة ${quoted}.`
        : 'اختر خيارًا من القائمة المحددة.';
    case 'toggle':
      if (options.kind === 'radio') {
        return label ? `اختر ${quoted}.` : 'اختر الخيار المحدد.';
      }
      if (options.checked === false) {
        return label ? `ألغِ تحديد ${quoted}.` : 'ألغِ تحديد الخيار المحدد.';
      }
      return label ? `حدّد ${quoted}.` : 'حدّد الخيار المحدد.';
    case 'manual':
      return '';
  }
}

export const SCREENSHOT_NOTE_INPUT =
  'لحماية خصوصيتك، لا تُلتقط لقطات لحقول الإدخال. يمكنك إضافة لقطة يدويًا من المحرر.';

export const SCREENSHOT_NOTE_FIELD =
  'لحماية خصوصيتك، لا تُلتقط لقطات لحقول الإدخال والقوائم. يمكنك إضافة لقطة يدويًا من المحرر.';

export const SCREENSHOT_NOTE_SENSITIVE =
  'تم تجاهل اللقطة لأن الحقل قد يحتوي على بيانات حساسة.';

export const SCREENSHOT_NOTE_FAILED =
  'تعذّر أخذ اللقطة. تأكد من بقاء التبويب مرئيًا، أو أضف صورة يدويًا من المحرر.';

export const SCREENSHOT_NOTE_RAPID =
  'لم تُلتقط اللقطة لأن الإجراءات كانت متتابعة بسرعة. يمكنك إضافتها يدويًا من المحرر.';

export const SCREENSHOT_NOTE_TAB_HIDDEN =
  'لم تُلتقط اللقطة لأن التبويب لم يكن مرئيًا. أبقِ الصفحة في المقدمة أثناء التسجيل.';
