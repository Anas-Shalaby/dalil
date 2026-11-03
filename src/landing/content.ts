import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Camera,
  Clock,
  Download,
  FileDown,
  Lock,
  MonitorPlay,
  Pencil,
  Repeat2,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react';

export const PRODUCT_TAGLINE = 'اشرحها مرة، وارجع لها وقت ما تحتاج.';

export const PRODUCT_SUPPORTING_COPY =
  'حوّل خطوات العمل على المواقع إلى أدلة مصوّرة واضحة. سجّل خطواتك، وضّح التفاصيل المهمة، وشارك دليلًا جاهزًا بدل ما تعيد نفس الشرح كل مرة.';

export const HERO = {
  eyebrow: 'إضافة Chrome عربية بالكامل',
  headlineBefore: 'اشرحها مرة،',
  headlineAccent: 'وارجع لها وقت ما تحتاج.',
  description: PRODUCT_SUPPORTING_COPY,
  primaryCta: 'حمّل دليل مجانًا',
  secondaryCta: 'شوف دليل بيشتغل إزاي',
  secondaryCtaHint: 'تعرف على التسجيل خطوة بخطوة',
} as const;

export const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'بلا تتبّع',
    text: 'لا نراقب ولا نخزن نشاطك في أي خدمة خارج المتصفح.',
  },
  {
    icon: Lock,
    title: 'بلا حساب',
    text: 'بلا تسجيل، بلا مزامنة. كل شيء محفوظ على جهازك.',
  },
  {
    icon: Download,
    title: 'مجانًا',
    text: 'التسجيل وتصدير أدلة PDF مجانيان بالكامل.',
  },
] as const;

export const PROBLEM = {
  eyebrow: 'الفهم',
  headline: 'كم مرة شرحت نفس الخطوات؟',
  lead: 'كل مرة تنتهي مشروع أو تتعلم برنامجًا جديدًا، تأتي الحاجة لشرح نفس الخطوة مرة أخرى. هكذا يتحول وقتك إلى روتين متكرر لا ينتهي.',
  flow: [
    {
      icon: Repeat2,
      title: 'تكرار الشرح',
      text: 'تحتاج تقول كيف شغّل شيئًا مرةً بعد ما تعلّمته.',
    },
    {
      icon: Clock,
      title: 'وقت وطاقة ضائعة',
      text: 'رسائل، مكالمات، وحتى عشرات الأسئلة عن نفس الإجراء.',
    },
    {
      icon: Camera,
      title: 'لقطات مبعثرة',
      text: 'لقطات في المحادثات، وشرح مبعثر في الملاحظات.',
    },
    {
      icon: BookOpen,
      title: 'دليل واضح',
      text: 'الدليل الجديد يجيب عن السؤال من أول مرة.',
    },
  ] as const,
} as const;

export type FeatureVisual = 'record' | 'steps' | 'annotate' | 'edit' | 'pdf' | 'arabic';

export interface Feature {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  points: readonly string[];
  visual: FeatureVisual;
  reversed?: boolean;
}

export const FEATURES: readonly Feature[] = [
  {
    id: 'record',
    eyebrow: 'التسجيل',
    title: 'سجّل خطوات شغلك',
    description:
      'بدل ما تكتب كل حاجة من الصفر، سجّل التفاعل الحقيقي. دليلك يبدأ من اللحظة اللي شهدتها أنت، ويسجّل الخطوات بنفسك بخطوات طبيعية.',
    points: [
      'تسجيل خطوات من التفاعل الحقيقي',
      'لقطات تلقائية بعد كل خطوة',
      'إعادة التسجيل أو التعديل يدوياً',
    ],
    visual: 'record',
  },
  {
    id: 'steps',
    eyebrow: 'الشرح المرئي',
    title: 'حوّل كل خطوة إلى شرح واضح بالصور',
    description:
      'مفيش خطوة بلا صورة. كل إجراء ياخد لقطة واضحة مرقّمة بترتيب تسلسل التنفيذ، فما تظلم ولا تضيّق.',
    points: [
      'أرقام مرقمة بترتيب التنفيذ',
      'شرح بصري لكل خطوة',
      'تعديل أي خطوة وإضافة شرح',
    ],
    visual: 'steps',
    reversed: true,
  },
  {
    id: 'annotate',
    eyebrow: 'التوضيحات',
    title: 'أضف الأسهم والتوضيحات',
    description:
      'حوّل لقطة شاشة عادية إلى دليل مفهوم. ضع أسهمًا وتعليقات، وحدد الأجزاء المهمة قبل ما تنسى.',
    points: [
      'أسهم ومعلّمات مرئية',
      'شرح بديل أو نص داخل اللقطة',
      'تخصيص التركيز لكل خطوة',
    ],
    visual: 'annotate',
  },
  {
    id: 'edit',
    eyebrow: 'التحرير',
    title: 'راجع دليلك وهو أقرب ليك',
    description:
      'عدّل الوصف، استبدل الصورة، أو ضع الشرح في المكان الصح. دليلك يفضل بيدك، لا بيد المحرر.',
    points: [
      'تعديل الوصف والعنوان',
      'استبدال لقطة أو إضافة خطوة',
      'تنظيم الخطوات حسب تسلسل مشروعك',
    ],
    visual: 'edit',
    reversed: true,
  },
  {
    id: 'pdf',
    eyebrow: 'التصدير',
    title: 'حوّل الدليل إلى ملف PDF جاهز للمشاركة',
    description:
      'صدّره دليلك إلى ملف PDF واحد بغلاف مهني يصلح للعميل أو الفريق. جاهز للطباعة أو المشاركة أو الإرسال.',
    points: [
      'ستة قوالب تصميم احترافية',
      'ألوان وهوية بصرية مخصصة',
      'غلاف للدليل مع تفاصيل مهمة',
    ],
    visual: 'pdf',
  },
  {
    id: 'arabic',
    eyebrow: 'اللغة والاتجاه',
    title: 'توثيق من تجربة عربية واضحة',
    description:
      'وثّم شغلك من خلال تجربة عربية كاملة: اتجاه من اليمين لليسار، خطوط عربية، وترجمة طبيعية للخطوات.',
    points: [
      'واجهة عربية كاملة (RTL)',
      'خطوط عربية عالية الجودة',
      'شرح موجه للمستخدم العربي',
    ],
    visual: 'arabic',
    reversed: true,
  },
];

export interface HowStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const HOW_IT_WORKS: readonly HowStep[] = [
  {
    icon: MonitorPlay,
    title: 'ابدأ توثيق خطواتك',
    description: 'افتح الموقع أو البرنامج، وشغّل التسجيل من صفحة دليل.',
  },
  {
    icon: Pencil,
    title: 'راجع وضّح',
    description: 'عدّل الوصف، وأضف الأسهم والتعليقات، وحدد التفاصيل المهمة.',
  },
  {
    icon: FileDown,
    title: 'صدر وشارك',
    description: 'جهّز دليلك وصدّره PDF وشاركه مع العميل أو الفريق.',
  },
];

export interface UseCase {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const USE_CASES: readonly UseCase[] = [
  {
    icon: Video,
    title: 'مطوّرو والمستقلون',
    description:
      'سلّم مشاريعك بشكل احترافي، ووثّق طريقة استخدام لوحة التحكم بدل ما تشرحها في كل مرة.',
  },
  {
    icon: Users,
    title: 'فرق وأعمال',
    description:
      'حوّل الإجراءات المتكررة إلى أدلة واضحة يرجع لها كل أعضاء الفريق.',
  },
  {
    icon: BookOpen,
    title: 'دعم وتدريب',
    description:
      'ساعد المستخدمين والعملاء يفهموا خطوات التنفيذ بسهولة قبل ما يطلّقوا العنان.',
  },
];

export interface BeforeAfter {
  before: {
    title: string;
    subtitle: string;
    items: readonly string[];
  };
  after: {
    title: string;
    subtitle: string;
    items: readonly string[];
  };
}

export const BEFORE_AFTER: BeforeAfter = {
  before: {
    title: 'قبل دليل',
    subtitle: 'رسالة واحدة، شرح طويل، ولقطات مبعثرة.',
    items: [
      'رسائل تشرح نفس الخطوة مرارًا',
      'شرح مكتوب غير مرتّب',
      'لقطات مبعثرة في محادثات',
      'تعليمات غير واضحة',
      'أسئلة متكررة',
    ],
  },
  after: {
    title: 'بعد دليل',
    subtitle: 'دليل واحد منظّم، جاهز للمشاركة.',
    items: [
      'دليل واحد منظّم',
      'خطوات مرقمة وواضحة',
      'لقطات مع شرح',
      'تعليمات قابلة للتعديل',
      'PDF جاهز للمشاركة',
    ],
  },
};

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: 'ما هو دليل؟',
    answer:
      'دليل هو إضافة Chrome تساعدك لوثّق خطوات عملك على المواقع أو البرامج بشكل مرئي ومرقّم، ثم تولّد دليلًا مصوّرًا يمكنك تعديله ومشاركته.',
  },
  {
    question: 'هل دليل مجاني؟',
    answer:
      'نعم، دليل مجاني بالكامل. التسجيل وتصدير أدلة PDF مجانيان، دون اشتراك أو حد مشاركة.',
  },
  {
    question: 'كيف أبدأ استخدام دليل؟',
    answer:
      'ثبّت الإضافة من متجر Chrome، وافتح الموقع أو البرنامج اللي تبي توثّقه، وابدأ التسجيل من صفحة دليل. بعدها راجع الخطوات وأضف الشرح الذي تحتاجه.',
  },
  {
    question: 'هل أستطيع تعديل الخطوات بعد التسجيل؟',
    answer: 'نعم. كل دليل في المكتبة قابل للتحرير من المحرر: عدّل الوصف، استبدل اللقطة، أو أضف خطوة جديدة.',
  },
  {
    question: 'هل يمكنني إضافة توضيحات على الصور؟',
    answer: 'نعم. في المحرر يمكنك إضافة أسهم وتعليقات وشرح بديل لكل لقطة، وحدد أي جزء من الصورة هو المهم.',
  },
  {
    question: 'هل يمكن تصدير الدليل PDF؟',
    answer: 'نعم. من المحرر يفتح استوديو PDF، ثم تصمم الدليل بمظهر احترافي وأصدره كملف PDF جاهز للمشاركة.',
  },
  {
    question: 'هل يعمل دليل على جميع المواقع؟',
    answer:
      'يعمل على معظم المواقع والأنظمة التي تدعّم واجهات Chrome التسجيل، مع بعض الاستثناءات المذكورة في سياسة الخصوصية. لنوثّق أي موقع تمنعه إضافات أو نظام التشغيل.',
  },
  {
    question: 'هل يعمل دليل على متصفحات أخرى؟',
    answer: 'الإضافة مخصصة لمتصفح Google Chrome لأنها تعتمد على واجهات Chrome المتاحة للتطبيقات.',
  },
  {
    question: 'أين يتم حفظ الأدلة؟',
    answer: 'تُحفظ الأدلة واللقطات على جهازك داخل متصفح Chrome، ولا يتم رفع أي محتوى إلى خوادم خارجية.',
  },
  {
    question: 'كيف يمكنني حذف بياناتي؟',
    answer: 'يمكنك حذف أي دليل من قسم أدلتي، وسيُزال معه مرفقاته المرتبطة. لا توجد حسابات، لذا الحذف يتم من جهازك أنت مباشرة.',
  },
];

export const FINAL_CTA = {
  eyebrow: 'الخطوة التالية',
  headlineBefore: 'خلّي شغلك',
  headlineAccent: 'يتشرح مرة واحدة.',
  description: 'ابدأ توثّق خطواتك مع دليل، ووفّر وقتك للمهام اللي تستحقها.',
  primaryCta: 'حمّل دليل مجانًا',
  secondaryCta: 'شوف دليل بيشتغل إزاي',
} as const;

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  annotationLabel: string;
}

export const DEMO_STEPS: readonly DemoStep[] = [
  {
    id: 'open-dashboard',
    title: 'افتح لوحة التحكم',
    description: 'من فضلك افتح لوحة التحكم من القائمة الرئيسية، ثم نفّذ الإجراء الذي تحب توثّقه.',
    annotationLabel: 'اختر من هنا',
  },
  {
    id: 'create-client',
    title: 'أنشئ عميلًا جديدًا',
    description: 'املأ البيانات واختر الخطة المناسبة، ثم احفظ التغييرات قبل المتابعة.',
    annotationLabel: 'اضغط هنا لحفظ',
  },
  {
    id: 'enable-notifications',
    title: 'فعّل الإشعارات',
    description: 'فعّل التنبيهات بعد الحفظ، ليصلك دليل واضح لأي شخص يحتاجه.',
    annotationLabel: 'فعّل التنبيه',
  },
];
