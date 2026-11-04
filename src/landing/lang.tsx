import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Lang = 'ar' | 'en';

const LANG_KEY = 'dalil-lang';

interface Strings {
  htmlLang: string;
  htmlDir: 'rtl' | 'ltr';

  nav: {
    brand: string;
    features: string;
    howItWorks: string;
    useCases: string;
    faq: string;
    install: string;
    toggleTheme: string;
    toggleLanguage: string;
  };

  skipLink: string;

  hero: {
    eyebrow: string;
    headline: string;
    accent: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    secondaryHint: string;
    trust1: string;
    trust2: string;
    trust3: string;
  };

  trust: {
    title: string;
    subtitle: string;
    description: string;
    items: Array<{ title: string; text: string }>;
  };

  problem: {
    eyebrow: string;
    headline: string;
    lead: string;
    items: Array<{ title: string; text: string }>;
  };

  features: {
    eyebrow: string;
    headline: string;
    description: string;
    items: Array<{
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      visual: string;
      reversed?: boolean;
      points: string[];
    }>;
  };

  how: {
    eyebrow: string;
    headline: string;
    description: string;
    steps: Array<{ title: string; description: string }>;
  };

  demo: {
    eyebrow: string;
    headline: string;
    description: string;
    steps: Array<{ title: string; description: string; label: string }>;
  };

  useCases: {
    eyebrow: string;
    headline: string;
    description: string;
    items: Array<{ title: string; description: string }>;
  };

  beforeAfter: {
    eyebrow: string;
    headline: string;
    description: string;
    before: { title: string; subtitle: string; items: string[] };
    after: { title: string; subtitle: string; items: string[] };
  };

  privacy: {
    title: string;
    subtitle: string;
    description: string;
    rightHeading: string;
    rightText: string;
    points: Array<{ title: string; text: string }>;
    cta: string;
    ctaHref: string;
  };

  faq: {
    eyebrow: string;
    headline: string;
    description: string;
    items: Array<{ question: string; answer: string }>;
  };

  finalCta: {
    eyebrow: string;
    headline: string;
    accent: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };

  footer: {
    description: string;
    links: Array<{ label: string; href: string }>;
    copyright: string;
  };
}

const AR: Strings = {
  htmlLang: 'ar',
  htmlDir: 'rtl',

  nav: {
    brand: 'دليل',
    features: 'المميزات',
    howItWorks: 'كيف يعمل',
    useCases: 'حالات الاستخدام',
    faq: 'الأسئلة الشائعة',
    install: 'حمل دليل مجاناً',
    toggleTheme: 'تبديل المظهر',
    toggleLanguage: 'English',
  },

  skipLink: 'الانتقال إلى المحتوى',

  hero: {
    eyebrow: 'إضافة كروم عربية لتوثيق العمل',
    headline: 'وثّق عملك مرة واحدة،',
    accent: 'واعتمده متى احتجت.',
    description:
      'حوّل خطوات العمل على أي موقع إلى دليل مصوّر واضح. سجّل خطواتك، أضف التوضيحات، وصدّر دليلاً PDF جاهزاً للمشاركة — بدل أن تشرح نفس الخطوة مراراً وتكراراً.',
    primaryCta: 'حمل دليل مجاناً',
    secondaryCta: 'شاهد كيف يعمل',
    secondaryHint: 'جرب العرض التفاعلي',
    trust1: 'بياناتك تبقى على جهازك',
    trust2: 'بدون حساب، بدون خادم',
    trust3: 'مجاناً',
  },

  trust: {
    title: 'الأمان والثقة',
    subtitle: 'لماذا يعتمد الناس على دليل؟',
    description:
      'دليل مصمّم ليعمل بدون حساب، وبدون خادم، وبدون إرسال أي محتوى أو بيانات خارج متصفحك. التركيز على الفائدة، لا على القلق.',
    items: [
      {
        title: 'بياناتك على جهازك',
        text: 'كل الأدلة ولقطات الشاشة تُحفظ داخل متصفح كروم فقط، ولا تُرفع لأي خادم خارجي.',
      },
      {
        title: 'بدون حساب، بدون تتبع',
        text: 'لا تسجيل دخول، لا مزامنة، ولا إرسال نشاطك لأي خدمة خارجية.',
      },
      {
        title: 'مجاناً',
        text: 'التسجيل وتصدير أدلة PDF مجانيان بالكامل، بدون اشتراك.',
      },
    ],
  },

  problem: {
    eyebrow: 'المشكلة',
    headline: 'كم مرة كررت شرح نفس الخطوات؟',
    lead:
      'في كل مرة تنهي فيها مشروعاً أو تتعلم برنامجاً جديداً، تجد نفسك مضطراً لشرح نفس الخطوات مرة أخرى. وهكذا يتحول وقتك إلى روتين مكرر.',
    items: [
      {
        title: 'تكرار الشرح',
        text: 'تحتاج إلى شرح كيفية تشغيل شيء ما أكثر من مرة.',
      },
      {
        title: 'إهدار الوقت والجهد',
        text: 'رسائل، مكالمات، وعشرات الأسئلة عن نفس الإجراء.',
      },
      {
        title: 'لقطات شاشة مبعثرة',
        text: 'صور في المحادثات، وشرح مبعثر في الملاحظات.',
      },
      {
        title: 'دليل واضح',
        text: 'الدليل الجديد يجيب عن السؤال من أول مرة.',
      },
    ],
  },

  features: {
    eyebrow: 'المميزات',
    headline: 'كل ما تحتاج لتوثيق عملك',
    description:
      'مجموعة متكاملة من التسجيل، الشرح المرئي، والتوثيق الاحترافي — بدون أي خطوة زائدة.',
    items: [
      {
        id: 'record',
        eyebrow: 'التسجيل',
        title: 'سجّل خطوات سير عملك',
        description:
          'بدلاً من كتابة كل شيء من الصفر، سجّل التفاعل الفعلي على الموقع. دليلك يبدأ من اللحظة التي شاهدتها.',
        points: [
          'تسجيل خطوات من التفاعل الفعلي',
          'لقطات تلقائية بعد كل خطوة',
          'إعادة التسجيل أو التعديل يدوياً',
        ],
        visual: 'record',
      },
      {
        id: 'steps',
        eyebrow: 'الشرح المرئي',
        title: 'حول كل خطوة إلى دليل بالصور',
        description:
          'كل خطوة مرفقة بلقطة واضحة ومرقمة حسب ترتيب التنفيذ، بحيث لا يضيع أي تفصيل.',
        points: [
          'أرقام مرقمة حسب التنفيذ',
          'شرح بصري لكل خطوة',
          'تعديل أي خطوة وإضافة شرح',
        ],
        visual: 'steps',
        reversed: true,
      },
      {
        id: 'annotate',
        eyebrow: 'التوضيحات',
        title: 'أضف السهام والتعليقات التوضيحية',
        description:
          'حوّل لقطة شاشة عادية إلى دليل مفهوم. أضف سهاماً، تعليقات، وحدد الأجزاء المهمة.',
        points: [
          'سهام ومؤشرات مرئية',
          'شرح بديل داخل اللقطة',
          'تخصيص التركيز لكل خطوة',
        ],
        visual: 'annotate',
      },
      {
        id: 'edit',
        eyebrow: 'التحرير',
        title: 'راجع وعدل دليلك',
        description:
          'عدّل الوصف، استبدل الصورة، أو أضف خطوة جديدة. الدليل يظل في إيديك.',
        points: [
          'تعديل العنوان والوصف',
          'استبدال لقطة أو إضافة خطوة',
          'تنظيم الخطوات حسب مشروعك',
        ],
        visual: 'edit',
        reversed: true,
      },
      {
        id: 'pdf',
        eyebrow: 'التصدير',
        title: 'صدّر دليل PDF احترافي',
        description:
          'حوّل دليلك إلى ملف PDF واحد بغلاف احترافي يصلح للعميل أو الفريق.',
        points: [
          'ستة قوالب تصميم احترافية',
          'ألوان وهوية بصرية مخصصة',
          'غلاف للدليل مع تفاصيل',
        ],
        visual: 'pdf',
      },
      {
        id: 'arabic',
        eyebrow: 'اللغة',
        title: 'تجربة عربية كاملة',
        description:
          'وثّق عملك بلغة عربية فصيحة واضحة، واتجاه من اليمين لليسار، وخطوط عربية عالية الجودة.',
        points: [
          'واجهة عربية كاملة (من اليمين لليسار)',
          'خطوط عربية ممتازة',
          'شرح موجه للمستخدم العربي',
        ],
        visual: 'arabic',
        reversed: true,
      },
    ],
  },

  how: {
    eyebrow: 'كيف يعمل',
    headline: 'ثلاث خطوات، دليل جاهز',
    description:
      'من أول تفاعل مع الموقع وحتى يكون دليلك جاهزاً للمشاركة — بخطوات بسيطة وسريعة.',
    steps: [
      {
        title: 'ابدأ التسجيل',
        description: 'افتح الموقع أو البرنامج، وشغّل التسجيل من صفحة دليل.',
      },
      {
        title: 'راجع ووضح',
        description: 'عدّل الوصف، وأضف السهام والتعليقات، وحدد التفاصيل المهمة.',
      },
      {
        title: 'صدّر وشارك',
        description: 'جهّز دليلك وصدّره PDF وشاركه مع العميل أو الفريق.',
      },
    ],
  },

  demo: {
    eyebrow: 'عرض تفاعلي',
    headline: 'شاهد كيف يبدو دليلك',
    description:
      'اختر خطوة من الدليل وشاهد كيف يتغير الشرح والتركيز مع كل خطوة — بدل أن تشرح نفس الشيء في كل مرة.',
    steps: [
      {
        title: 'افتح لوحة التحكم',
        description: 'من فضلك افتح لوحة التحكم من القائمة الرئيسية.',
        label: 'اختر من هنا',
      },
      {
        title: 'أنشئ عميلاً جديداً',
        description: 'املأ البيانات واختر الخطة المناسبة، ثم احفظ التغييرات.',
        label: 'اضغط هنا للحفظ',
      },
      {
        title: 'فعّل الإشعارات',
        description: 'فعّل التنبيهات بعد الحفظ، ليصلك دليل واضح.',
        label: 'فعّل التنبيه',
      },
    ],
  },

  useCases: {
    eyebrow: 'حالات الاستخدام',
    headline: 'دليل يناسب طبيعة عملك',
    description:
      'سواء كنت مطوّراً، مستقلاً، أو تدعم فريقاً — دليل يناسب عملك، وليس العكس.',
    items: [
      {
        title: 'المطوّرون والمستقلون',
        description:
          'سلّم مشاريعك بشكل احترافي، ووثّق طريقة استخدام لوحة التحكم بدل أن تشرحها في كل مرة.',
      },
      {
        title: 'الفرق والوكالات',
        description:
          'حوّل الإجراءات المتكررة إلى أدلة واضحة يرجع لها كل أعضاء الفريق.',
      },
      {
        title: 'الدعم والتدريب',
        description:
          'ساعد المستخدمين والعملاء على فهم خطوات التنفيذ بسهولة.',
      },
    ],
  },

  beforeAfter: {
    eyebrow: 'التحول',
    headline: 'قبل دليل وبعده',
    description:
      'الفرق بين الشرح المتكرر والمبعثر، وبين دليل واحد منظم وجاهز للمشاركة.',
    before: {
      title: 'قبل دليل',
      subtitle: 'رسالة واحدة، شرح طويل، ولقطات مبعثرة.',
      items: [
        'رسائل تشرح نفس الخطوة مراراً',
        'شرح مكتوب غير منظم',
        'لقطات مبعثرة في المحادثات',
        'تعليمات غير واضحة',
        'أسئلة متكررة',
      ],
    },
    after: {
      title: 'بعد دليل',
      subtitle: 'دليل واحد منظم، جاهز للمشاركة.',
      items: [
        'دليل واحد منظم',
        'خطوات مرقمة وواضحة',
        'لقطات مع شرح',
        'تعليمات قابلة للتعديل',
        'PDF جاهز للمشاركة',
      ],
    },
  },

  privacy: {
    title: 'الخصوصية',
    subtitle: 'بياناتك تبقى على جهازك',
    description:
      'نعلم أن أي إضافة تتفاعل مع المتصفح تطرح أسئلة. هدفنا أن تكون الصورة واضحة قبل أن تثبّت: ماذا يلمس النظام، وأين تذهب البيانات، ولماذا لا نرسل لك أي شيء.',
    points: [
      {
        title: 'ما يصلح للتسجيل',
        text: 'النقر على الأزرار والروابط والتسجيلات الشائعة داخل الصفحة النشطة.',
      },
      {
        title: 'ما يتم تجاهله',
        text: 'حقول الإدخال والقوائم التي قد تحتوي على محتوى حساس.',
      },
      {
        title: 'أين تبقى البيانات',
        text: 'في متصفحك وفي chrome.storage.local، بدون رفع لأي خدمة.',
      },
    ],
    cta: 'اقرأ سياسة الخصوصية كاملة',
    ctaHref: 'https://dalil.example.com/privacy',
    rightHeading: 'خصوصية يمكنك الوثوق بها',
    rightText:
      'نعلم أن أي إضافة تتفاعل مع المتصفح تثير تساؤلات مشروعة. هدفنا أن نكون واضحين قبل أن تثبّت: ما الذي يمسه النظام، وأين تذهب البيانات، ولماذا لا نرسل لك أي شيء.',
  },

  faq: {
    eyebrow: 'الأسئلة الشائعة',
    headline: 'كل ما تريد معرفته',
    description:
      'إجابات موجزة، بدون تعقيد. وإذا لم يتبين لك شيء، راسلنا من خلال الإضافة.',
    items: [
      {
        question: 'ما هو دليل؟',
        answer: 'دليل هو إضافة كروم تساعدك على توثيق خطوات عملك على المواقع أو البرامج بشكل مرئي ومرقم، ثم تولّد دليلاً مصوّراً يمكنك تعديله ومشاركته.',
      },
      {
        question: 'هل دليل مجاني؟',
        answer: 'نعم، دليل مجاني بالكامل. التسجيل وتصدير أدلة PDF مجانيان، بدون اشتراك.',
      },
      {
        question: 'كيف أبدأ استخدام دليل؟',
        answer: 'ثبّت الإضافة من متجر كروم، وافتح الموقع أو البرنامج الذي تريد توثيقه، وابدأ التسجيل من صفحة دليل. depois راجع الخطوات وأضف الشرح الذي تحتاجه.',
      },
      {
        question: 'هل يمكنني تعديل الخطوات بعد التسجيل؟',
        answer: 'نعم. كل دليل في المكتبة قابل للتعديل من المحرر: عدّل الوصف، استبدل اللقطة، أو أضف خطوة جديدة.',
      },
      {
        question: 'هل يمكنني إضافة توضيحات على الصور؟',
        answer: 'نعم. في المحرر يمكنك إضافة سهام وتعليقات وشرح بديل لكل لقطة، وتحديد أي جزء من الصورة هو المهم.',
      },
      {
        question: 'هل يمكن تصدير الدليل PDF؟',
        answer: 'نعم. من المحرر يفتح استوديو PDF، ثم تصمم الدليل بمظهر احترافي وتصدره كملف PDF جاهز للمشاركة.',
      },
      {
        question: 'هل يعمل دليل على جميع المواقع؟',
        answer: 'يعمل على معظم المواقع التي تدعم واجهات كروم للتسجيل، مع بعض الاستثناءات المذكورة في سياسة الخصوصية.',
      },
      {
        question: 'هل يعمل على متصفحات أخرى؟',
        answer: 'الإضافة مخصصة لمتصفح جوجل كروم لأنها تعتمد على واجهات كروم المتاحة للتطبيقات.',
      },
      {
        question: 'أين يتم حفظ الأدلة؟',
        answer: 'تُحفظ الأدلة ولقطات الشاشة على جهازك داخل متصفح كروم، ولا تُرفع أي محتوى إلى خوادم خارجية.',
      },
      {
        question: 'كيف يمكنني حذف بياناتي؟',
        answer: 'يمكنك حذف أي دليل من قسم أدلتي، وسيُزال معه مرفقاته المرتبطة. لا توجد حسابات، لذا الحذف يتم من جهازك مباشرة.',
      },
    ],
  },

  finalCta: {
    eyebrow: 'الخطوة التالية',
    headline: 'اترك عملك',
    accent: 'يُوثق مرة واحدة.',
    description: 'ابدأ توثيق خطواتك مع دليل، ووفّر وقتك للمهام التي تستحقها.',
    primaryCta: 'حمل دليل مجاناً',
    secondaryCta: 'شاهد كيف يعمل',
  },

  footer: {
    description:
      'حوّل خطوات عملك على المواقع إلى أدلة مصورة واضحة، واربح وقتك من إعادة الشرح.',
    links: [
      { label: 'المميزات', href: '#features' },
      { label: 'كيف يعمل', href: '#how' },
      { label: 'حالات الاستخدام', href: '#use-cases' },
      { label: 'الأسئلة الشائعة', href: '#faq' },
      { label: 'متجر كروم', href: 'https://chromewebstore.google.com/detail/%D9%84%D8%AF%D9%8A%D9%84-%E2%80%94-dalil/gghamlnlpgehpdmnififnejhibdflhjo' },
    ],
    copyright: '© 2026 دليل. جميع الحقوق محفوظة.',
  },
};

const EN: Strings = {
  htmlLang: 'en',
  htmlDir: 'ltr',

  nav: {
    brand: 'Dalil',
    features: 'Features',
    howItWorks: 'How it works',
    useCases: 'Use cases',
    faq: 'FAQ',
    install: 'Download Dalil for free',
    toggleTheme: 'Toggle theme',
    toggleLanguage: 'العربية',
  },

  skipLink: 'Skip to content',

  hero: {
    eyebrow: 'Arabic Chrome extension for work documentation',
    headline: 'Document your work once,',
    accent: 'and use it anytime.',
    description:
      'Turn workflow steps on any website into a clear visual guide. Record your actions, add annotations, and export a ready-to-share PDF — instead of explaining the same steps over and over.',
    primaryCta: 'Download Dalil for free',
    secondaryCta: 'See how it works',
    secondaryHint: 'Try the interactive demo',
    trust1: 'Your data stays on your device',
    trust2: 'No account, no server',
    trust3: 'Free',
  },

  trust: {
    title: 'Security and trust',
    subtitle: 'Why people rely on Dalil',
    description:
      'Dalil is designed to work without an account, without a server, and without sending any content or data outside your browser. The focus is on value, not worry.',
    items: [
      {
        title: 'Your data on your device',
        text: 'All guides and screenshots are saved only inside Chrome, and never uploaded to an external server.',
      },
      {
        title: 'No account, no tracking',
        text: 'No sign-in, no sync, and no activity sent to any external service.',
      },
      {
        title: 'Free',
        text: 'Recording and PDF export are completely free, with no subscription.',
      },
    ],
  },

  problem: {
    eyebrow: 'The problem',
    headline: 'How many times have you repeated the same steps?',
    lead:
      'Every time you finish a project or learn a new app, you end up explaining the same steps again. Your time turns into a repetitive routine.',
    items: [
      {
        title: 'Repeating explanations',
        text: 'You have to explain how to run something over and over.',
      },
      {
        title: 'Wasted time and energy',
        text: 'Messages, calls, and dozens of questions about the same task.',
      },
      {
        title: 'Scattered screenshots',
        text: 'Images in chats, and explanations scattered across notes.',
      },
      {
        title: 'A clear guide',
        text: 'The new guide answers the question the first time.',
      },
    ],
  },

  features: {
    eyebrow: 'Features',
    headline: 'Everything you need to document your work',
    description:
      'An integrated set of recording, visual explanation, and professional documentation — with no unnecessary steps.',
    items: [
      {
        id: 'record',
        eyebrow: 'Record',
        title: 'Record your workflow steps',
        description:
          'Instead of writing everything from scratch, record the actual interaction on the website. Your guide starts from the moment you saw it.',
        points: ['Record steps from real interaction', 'Automatic screenshot after each step', 'Re-record or edit manually'],
        visual: 'record',
      },
      {
        id: 'steps',
        eyebrow: 'Visual guides',
        title: 'Turn every step into a visual guide',
        description:
          'Every step comes with a clear screenshot, numbered by execution order, so nothing is lost.',
        points: ['Numbered by execution order', 'Visual explanation for every step', 'Edit any step and add description'],
        visual: 'steps',
        reversed: true,
      },
      {
        id: 'annotate',
        eyebrow: 'Annotations',
        title: 'Add arrows and annotations',
        description:
          'Turn an ordinary screenshot into an understandable guide. Add arrows, comments, and highlight important parts.',
        points: ['Visual arrows and markers', 'Alternative text inside screenshot', 'Focus customization per step'],
        visual: 'annotate',
      },
      {
        id: 'edit',
        eyebrow: 'Edit',
        title: 'Review and edit your guide',
        description:
          'Edit the description, replace the image, or add a new step. The guide stays in your hands.',
        points: ['Edit title and description', 'Replace screenshot or add step', 'Organize steps by your project'],
        visual: 'edit',
        reversed: true,
      },
      {
        id: 'pdf',
        eyebrow: 'Export',
        title: 'Export a professional PDF guide',
        description:
          'Turn your guide into one PDF file with a professional cover, ready for clients or teams.',
        points: ['Six professional design templates', 'Custom colors and branding', 'Guide cover with details'],
        visual: 'pdf',
      },
      {
        id: 'arabic',
        eyebrow: 'Language',
        title: 'Full Arabic experience',
        description:
          'Document your work in clear Arabic, with right-to-left direction and high-quality Arabic fonts.',
        points: ['Full Arabic interface (RTL)', 'Excellent Arabic fonts', 'Guide written for Arabic speakers'],
        visual: 'arabic',
        reversed: true,
      },
    ],
  },

  how: {
    eyebrow: 'How it works',
    headline: 'Three steps, a ready guide',
    description:
      'From your first interaction with the site until your guide is ready to share — in simple, quick steps.',
    steps: [
      {
        title: 'Start recording',
        description: 'Open the site or app, and start recording from the Dalil page.',
      },
      {
        title: 'Review and explain',
        description: 'Edit the description, add arrows and comments, and highlight important details.',
      },
      {
        title: 'Export and share',
        description: 'Prepare your guide, export it as PDF, and share it with your client or team.',
      },
    ],
  },

  demo: {
    eyebrow: 'Interactive demo',
    headline: 'See how your guide looks',
    description:
      'Pick a step from the guide and watch how the explanation and focus change with each step — instead of explaining the same thing every time.',
    steps: [
      {
        title: 'Open the dashboard',
        description: 'Please open the dashboard from the main menu.',
        label: 'Choose from here',
      },
      {
        title: 'Create a new client',
        description: 'Fill in the data and choose the suitable plan, then save the changes.',
        label: 'Click here to save',
      },
      {
        title: 'Enable notifications',
        description: 'Enable notifications after saving, so you get a clear guide.',
        label: 'Enable notifications',
      },
    ],
  },

  useCases: {
    eyebrow: 'Use cases',
    headline: 'A guide that fits your work',
    description:
      'Whether you are a developer, freelancer, or support a team — Dalil fits your work, not the other way around.',
    items: [
      {
        title: 'Developers & Freelancers',
        description:
          'Deliver your projects professionally, and document how to use the control panel instead of explaining it every time.',
      },
      {
        title: 'Teams & Agencies',
        description:
          'Turn recurring procedures into clear guides that every team member can refer to.',
      },
      {
        title: 'Support & Training',
        description:
          'Help users and customers understand execution steps easily.',
      },
    ],
  },

  beforeAfter: {
    eyebrow: 'The transformation',
    headline: 'Before and after Dalil',
    description:
      'The difference between repeated and scattered explanations, and one organized, share-ready guide.',
    before: {
      title: 'Before Dalil',
      subtitle: 'One message, long explanations, and scattered screenshots.',
      items: [
        'Messages explaining the same step repeatedly',
        'Unorganized written explanation',
        'Screenshots scattered across chats',
        'Unclear instructions',
        'Repeated questions',
      ],
    },
    after: {
      title: 'After Dalil',
      subtitle: 'One organized guide, ready to share.',
      items: [
        'One organized guide',
        'Clear numbered steps',
        'Screenshots with explanation',
        'Editable instructions',
        'PDF ready to share',
      ],
    },
  },

  privacy: {
    title: 'Privacy',
    subtitle: 'Your data stays on your device',
    description:
      'We know any extension that interacts with the browser raises questions. Our goal is to be clear before you install: what the system touches, where data goes, and why we never send you anything.',
    points: [
      {
        title: 'What is eligible for recording',
        text: 'Clicks on buttons, links, and common recordings inside the active page.',
      },
      {
        title: 'What is ignored',
        text: 'Input fields and menus that may contain sensitive content.',
      },
      {
        title: 'Where data stays',
        text: 'In your browser and chrome.storage.local, with no upload to any service.',
      },
    ],
    cta: 'Read the full privacy policy',
    ctaHref: 'https://dalil.example.com/privacy',
    rightHeading: 'Privacy you can trust',
    rightText:
      'We know any extension that interacts with the browser raises questions. Our goal is to be clear before you install: what the system touches, where data goes, and why we never send you anything.',
  },

  faq: {
    eyebrow: 'Frequently asked questions',
    headline: 'Everything you want to know',
    description:
      'Short answers, no complexity. And if something is unclear, contact us through the extension.',
    items: [
      {
        question: 'What is Dalil?',
        answer: 'Dalil is a Chrome extension that helps you document your work steps on websites or apps visually and with numbering, then generates an illustrated guide you can edit and share.',
      },
      {
        question: 'Is Dalil free?',
        answer: 'Yes, Dalil is completely free. Recording and PDF export are free, with no subscription.',
      },
      {
        question: 'How do I start using Dalil?',
        answer: 'Install the extension from the Chrome Web Store, open the site or app you want to document, and start recording from the Dalil page. Then review the steps and add the description you need.',
      },
      {
        question: 'Can I edit steps after recording?',
        answer: 'Yes. Every guide in the library is editable from the editor: edit the description, replace the screenshot, or add a new step.',
      },
      {
        question: 'Can I add annotations to images?',
        answer: 'Yes. In the editor you can add arrows, comments, and alternative text for each screenshot, and specify which part of the image is important.',
      },
      {
        question: 'Can I export the guide as PDF?',
        answer: 'Yes. From the editor, the PDF Studio opens, then you design the guide with a professional look and export it as a ready-to-share PDF file.',
      },
      {
        question: 'Does Dalil work on all websites?',
        answer: 'It works on most websites that support Chrome recording interfaces, with some exceptions mentioned in the privacy policy.',
      },
      {
        question: 'Does it work on other browsers?',
        answer: 'The extension is dedicated to Google Chrome because it relies on Chrome interfaces available for apps.',
      },
      {
        question: 'Where are guides saved?',
        answer: 'Guides and screenshots are saved on your device inside Chrome, and no content is uploaded to external servers.',
      },
      {
        question: 'How can I delete my data?',
        answer: 'You can delete any guide from My Guides, and its attachments will be removed with it. There are no accounts, so deletion happens directly on your device.',
      },
    ],
  },

  finalCta: {
    eyebrow: 'Next step',
    headline: 'Let your work',
    accent: 'be explained once.',
    description: 'Start documenting your steps with Dalil, and save your time for the tasks that deserve it.',
    primaryCta: 'Download Dalil for free',
    secondaryCta: 'See how it works',
  },

  footer: {
    description:
      'Turn your work steps on websites into clear illustrated guides, and save your time from repeating explanations.',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how' },
      { label: 'Use cases', href: '#use-cases' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Chrome Web Store', href: 'https://chromewebstore.google.com/detail/%D9%84%D8%AF%D9%8A%D9%84-%E2%80%94-dalil/gghamlnlpgehpdmnififnejhibdflhjo' },
    ],
    copyright: '© 2026 Dalil. All rights reserved.',
  },
};

export const STRINGS: Record<Lang, Strings> = { ar: AR, en: EN };

interface LangContextProps {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (path: string) => string;
  strings: Strings;
}

const LangContext = createContext<LangContextProps | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return (saved === 'ar' || saved === 'en') ? saved : 'ar';
  });

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    const html = document.documentElement;
    html.lang = STRINGS[lang].htmlLang;
    html.dir = STRINGS[lang].htmlDir;
  }, [lang]);

  const t = useCallback(
    (path: string): string => {
      const dict = STRINGS[lang];
      const parts = path.split('.');
      let value: unknown = dict;
      for (const part of parts) {
        value = (value as Record<string, unknown>)?.[part];
        if (value == null) return path;
      }
      return typeof value === 'string' ? value : path;
    },
    [lang],
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t, strings: STRINGS[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error('useLang must be used within LangProvider');
  }
  return ctx;
}
