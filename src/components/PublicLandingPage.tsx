import React, { useState } from 'react';
import { MarketTicker, TradeSignal } from '../types/trading';
import {
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronDown,
  Copy,
  Sliders,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Sparkles,
  Bot,
  MessageSquare,
  Globe,
  Tag,
  Clock,
  Send,
  Calculator,
  Target,
  Lock,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { HeaderTicker } from './layout/HeaderTicker';
import { ArticleReaderModal, ArticleData } from './ArticleReaderModal';
import { soundManager } from '../utils/audio';

interface Props {
  tickers: MarketTicker[];
  winningSignals: TradeSignal[];
  onOpenAuth: (tab: 'login' | 'signup', initialPromo?: string) => void;
  onOpenBrokerModal: () => void;
  onOpenPromoModal?: () => void;
  onDirectEnterDashboard: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: () => void;
}

type HeroTab = 'live_desk' | 'signals' | 'ai_advisor' | 'backtest';

const ARTICLES: ArticleData[] = [
  {
    id: 'art-1',
    tag: 'إدارة المخاطر • Risk Management',
    readTime: '5 min read',
    titleAr: 'تشريح مفكرة التداول ذات العائد المتوقع العالي',
    titleEn: 'The Anatomy of a High-Expectancy Trading Journal',
    subtitleAr: 'لماذا يفشل 90% من المتداولين في توثيق صفقاتهم، وكيف تبني اليوميات حلقة تعلم تراكمية تضمن الاستمرارية.',
    subtitleEn: 'Why 90% of retail traders fail at journaling, and how structured logging builds a compounding learning loop.',
    sectionsAr: [
      {
        heading: '1. الفخ الأكبر: تدوين الأرقام وإهمال السياق النفسي والبيئي',
        content: 'معظم المتداولين يكتفون بتسجيل سعر الدخول وسعر الخروج والربح أو الخسارة بالدولار. هذا السجل عديم الفائدة تقريباً! القيمة الحقيقية تكمن في تدوين: حالة السوق قبل الدخول (سحب سيولة، كسر قمة سابقة)، الإطار الزمني للقرار، ومستوى التزامك بخطة التداول المسبقة.'
      },
      {
        heading: '2. قاعدة لقطات الشارت الثلاثية (قبل، أثناء، بعد)',
        content: 'في MBK Desk نوصي بالتقاط 3 صور لكل عملية: الأولى عند رصد منطقة الطلب/العرض، الثانية عند تفعيل الصفقة، والثالثة بعد ضرب الهدف أو وقف الخسارة. مراجعة هذه الصور في عطلة نهاية الأسبوع تكشف أنماطك السلوكية بدقة لا تقبل الشك.'
      },
      {
        heading: '3. مؤشر الانضباط مقابل العائد',
        content: 'الصفقة الرابحة التي خالفت فيها خطتك هي في الحقيقة صفقة سيئة تؤسس لعادات مدمرة. بينما الصفقة الخاسرة التي التزمت فيها بحجم اللوت ووقف الخسارة بدقة هي صفقة ممتازة تستحق الإشادة.'
      }
    ],
    sectionsEn: [
      {
        heading: '1. The Biggest Trap: Logging Numbers Without Context',
        content: 'Most traders only record entry price, exit price, and dollar PnL. This is virtually useless! The real edge comes from logging the market environment (liquidity sweep, structural shift), time of execution, and psychological discipline.'
      },
      {
        heading: '2. The Three-Screenshot Rule (Before, During, After)',
        content: 'Capture three moments for every trade: the setup formation, the exact execution bar, and the post-trade resolution. Reviewing these over the weekend exposes unconscious behavioral biases.'
      },
      {
        heading: '3. Process Over Outcome',
        content: 'A winning trade that broke rules is a bad trade that reinforces fatal habits. A losing trade taken strictly according to plan is an exemplary execution.'
      }
    ],
    takeawaysAr: [
      'دوّن سبب الدخول قبل ضغط زر التنفيذ وليس بعده.',
      'افصل بين جودة التنفيذ ونتيجة الصفقة المالية.',
      'راجع صفقات الأسبوع كل سبت وحدد أكثر الأخطاء تكراراً للتخلص منها.'
    ],
    takeawaysEn: [
      'Log the rationale before clicking buy or sell, never in hindsight.',
      'Decouple execution quality from short-term financial outcome.',
      'Audit your weekly trades every weekend to systematically eliminate leaks.'
    ]
  },
  {
    id: 'art-2',
    tag: 'الرياضيات المالية • Trading Math',
    readTime: '7 min read',
    titleAr: 'إتقان العائد إلى المخاطرة: لماذا يغير معدل 1:2.4 كل شيء',
    titleEn: 'Mastering Risk-to-Reward: Why 1:2.4 R:R Changes Everything',
    subtitleAr: 'دليل رياضي يوضح كيف تحقق أرباحاً ثابتة حتى مع نسبة نجاح 40%، وكيف تبني إشارات MBK ميزتها التنافسية.',
    subtitleEn: 'A mathematical proof showing why a 1:2.4 risk-to-reward ratio achieves consistent profitability even at 40% win rates.',
    sectionsAr: [
      {
        heading: '1. وهم نسبة النجاح المرتفعة (The Win Rate Fallacy)',
        content: 'المتداول المبتدئ يبحث عن استراتيجية تحقق 90% ربح. في الواقع، أغلب الصناديق الاستثمارية العالمية تعمل بنسبة نجاح بين 45% و 55% ولكن بمعدل عائد إلى مخاطرة يتجاوز 1:2. عندما تخسر $100 وتربح $240 في كل صفقة، يكفيك الفوز في 4 صفقات من أصل 10 لتحقق أرباحاً صافية ملموسة.'
      },
      {
        heading: '2. نموذج الـ 100 صفقة الرياضي',
        content: 'لنفترض 100 صفقة بمخاطرة $500 للصفقة:\n• 40 صفقة رابحة × $1,200 (بمعدل 1:2.4) = +$48,000\n• 60 صفقة خاسرة × $500 = -$30,000\n• الصافي: +$18,000 ربح رغم أنك كنت مخطئاً في 60% من الأوقات!'
      },
      {
        heading: '3. كيف تطبق مؤشرات MBK هذا المبدأ',
        content: 'إشارات MBK Scalp Breakout تضع وقف الخسارة خلف القاع الهيكلي مباشرة (متوسط 25 إلى 35 نقطة في ناسداك) بينما الهدف الثاني يمتد لـ 70 إلى 120 نقطة، مما يضمن أن الرياضيات تعمل دائماً في صالحك.'
      }
    ],
    sectionsEn: [
      {
        heading: '1. The Win Rate Fallacy',
        content: 'Beginners seek a 90% win rate Holy Grail. In reality, institutional quant funds operate at 45%-55% win rates with asymmetric 1:2+ R:R. When you risk $100 to make $240, winning only 4 out of 10 trades yields solid compounding profits.'
      },
      {
        heading: '2. The 100-Trade Mathematical Model',
        content: 'Consider 100 trades risking $500 per setup:\n• 40 wins × $1,200 (at 1:2.4 R:R) = +$48,000\n• 60 losses × $500 = -$30,000\n• Net Profit: +$18,000 even though 60% of setups failed!'
      },
      {
        heading: '3. MBK Engine Implementation',
        content: 'MBK Scalp Breakout anchors invalidation levels behind structural pivots (25-35 pips on US100) while TP2 targets liquidity pools 70-120 pips away, ensuring positive mathematical expectancy.'
      }
    ],
    takeawaysAr: [
      'لا تدخل أي صفقة يقل العائد المحتمل فيها عن ضعف المخاطرة (1:2).',
      'حدد وقف الخسارة قبل الدخول ولا تحركه أبداً للخلف.',
      'احسب حجم اللوت بناءً على النسبة المئوية للمخاطرة (1% - 2%) وليس المبلغ الثابت.'
    ],
    takeawaysEn: [
      'Never enter a trade with an expectancy below 1:2 Risk/Reward.',
      'Define structural invalidation before execution; never widen stops.',
      'Calculate position size based on strict 1%-2% account equity risk.'
    ]
  },
  {
    id: 'art-3',
    tag: 'سيولة المؤسسات • Market Structure',
    readTime: '6 min read',
    titleAr: 'سيولة الجلسات: التداول الذكي مع افتتاح لندن ونيويورك',
    titleEn: 'Session Liquidity: Trading London and New York Openings',
    subtitleAr: 'فهم تحركات صانع السوق وتحديد فخاخ الكسر الكاذب في أول 45 دقيقة من جرس الافتتاح الأمريكي والأوروبي.',
    subtitleEn: 'Understanding institutional market maker traps, opening sweeps, and liquidity manipulation during the first 45 minutes.',
    sectionsAr: [
      {
        heading: '1. فخ جرس الافتتاح (Opening Drive Manipulation)',
        content: 'خلال أول 15 دقيقة من افتتاح نيويورك (16:30 بتوقيت مكة)، يقوم كبار المتداولين بدفع السعر بقوة لضرب أوامر وقف الخسارة فوق قمة جلسة آسيا أو لندن لجذب أوامر الشراء العاطفية، قبل أن يعكسوا الاتجاه الحقيقي نحو مناطق السيولة العميقة.'
      },
      {
        heading: '2. منطقة التداخل الذهبية (London / NY Overlap)',
        content: 'الفترة بين 16:30 و 19:30 بتوقيت مكة تشهد أكثر من 70% من حجم التداول اليومي في أزواج الذهب وناسداك. التحركات خلال هذه الساعات تتمتع بأعلى زخم واتجاه واضح.'
      },
      {
        heading: '3. استراتيجية الكسر الكاذب وسحب السيولة (Judas Swing)',
        content: 'انتظر حتى ينكسر مستوى رئيسي، ثم راقب شمعة الـ 5 دقائق: إذا أغلقت الشمعة بذيل طويل وعادت داخل النطاق، فهذا تأكيد بنسبة 85% على سحب السيولة، وتكون إشارة الدخول باتجاه العكس.'
      }
    ],
    sectionsEn: [
      {
        heading: '1. The Opening Bell Manipulation',
        content: 'During the first 15 minutes of the New York open, institutional flow often forces a sudden sweep above Asian or London session highs to trigger retail buy stops, absorbing counterparty liquidity before reversing into the true trend.'
      },
      {
        heading: '2. The Golden Overlap (London / New York)',
        content: 'The window between 13:30 and 16:30 UTC represents over 70% of global daily volume in US100 and Gold. Setups during this overlap have the highest follow-through momentum.'
      },
      {
        heading: '3. The Judas Swing Execution',
        content: 'Allow the initial high/low break to occur. If a 5-minute candle wicks sharply back inside range with high volume, it confirms liquidity absorption—giving high probability for a reversal entry.'
      }
    ],
    takeawaysAr: [
      'تجنب الدخول في أول 5 دقائق من جرس الافتتاح وانتظر انتهاء فخاخ الكسر.',
      'راقب قمم وقيعان جلسة آسيا كمصائد سيولة رئيسية لليوم.',
      'ادمج مؤشر الفجوة السعرية (FVG) لتأكيد جودة مناطق الارتداد.'
    ],
    takeawaysEn: [
      'Avoid market orders during the first 5 minutes of market open.',
      'Use Asian session highs and lows as primary target liquidity sweeps.',
      'Pair FVG imbalances with session sweeps for high-confluence entries.'
    ]
  }
];

export const PublicLandingPage: React.FC<Props> = ({
  tickers,
  winningSignals,
  onOpenAuth,
  onOpenBrokerModal,
  onOpenPromoModal,
  onDirectEnterDashboard,
  lang: controlledLang,
  onToggleLang
}) => {
  // Language state (support controlled or internal)
  const [internalLang, setInternalLang] = useState<'ar' | 'en'>('ar');
  const lang = controlledLang || internalLang;
  const isAr = lang === 'ar';

  const toggleLang = () => {
    soundManager.playClick();
    if (onToggleLang) {
      onToggleLang();
    } else {
      setInternalLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
    }
  };

  // Hero interactive tabs
  const [heroTab, setHeroTab] = useState<HeroTab>('live_desk');
  const [heroSymbol, setHeroSymbol] = useState<'US100' | 'XAUUSD'>('US100');

  // Quick Lot Size Calculator State
  const [calcBalance, setCalcBalance] = useState<number>(10000);
  const [calcRiskPercent, setCalcRiskPercent] = useState<number>(1.5);
  const [calcStopLossPips, setCalcStopLossPips] = useState<number>(30);

  const calculatedDollarRisk = (calcBalance * calcRiskPercent) / 100;
  const calculatedLotSize = +(calculatedDollarRisk / (calcStopLossPips * 10)).toFixed(2);

  // Live Signals Copy Feedback Toast
  const [copiedSignalText, setCopiedSignalText] = useState<string | null>(null);

  // AI Advisor Interactive Prompt State
  const [aiQuestion, setAiQuestion] = useState(
    isAr ? 'ما هو سيناريو السيولة والكسر الكاذب لناسداك اليوم؟' : 'What is today’s liquidity sweep roadmap for US100?'
  );
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Backtest Lab Simulator State
  const [backtestPlaying, setBacktestPlaying] = useState(false);
  const [backtestStep, setBacktestStep] = useState(6);
  const [virtualEquity, setVirtualEquity] = useState(10000);
  const [virtualTradesCount, setVirtualTradesCount] = useState(8);

  // Pricing State
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  // Workflow State (#workflow)
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);
  const [activeWorkflowPill, setActiveWorkflowPill] = useState<string>('ideas');

  // Features Showcase Subtabs (#features)
  const [featureTabs, setFeatureTabs] = useState<{ [key: number]: number }>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  });

  // FAQs open state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Article Reader Modal State
  const [activeArticle, setActiveArticle] = useState<ArticleData | null>(null);
  const [articleModalOpen, setArticleModalOpen] = useState(false);

  const handleAuthClick = (tab: 'login' | 'signup', promo?: string) => {
    soundManager.playClick();
    onOpenAuth(tab, promo);
  };

  const handleBrokerClick = () => {
    soundManager.playClick();
    onOpenBrokerModal();
  };

  const handlePromoClick = () => {
    soundManager.playClick();
    if (onOpenPromoModal) {
      onOpenPromoModal();
    } else {
      onOpenAuth('signup', 'MBK2026');
    }
  };

  const handleDemoClick = () => {
    soundManager.playClick();
    onDirectEnterDashboard();
  };

  const handleCopyLevels = (text: string) => {
    soundManager.playClick();
    navigator.clipboard.writeText(text);
    setCopiedSignalText(isAr ? 'تم نسخ مستويات الصفقة بنجاح! ✓' : 'Levels copied to clipboard! ✓');
    setTimeout(() => setCopiedSignalText(null), 2500);
  };

  const handleSimulateAiPrompt = (promptText: string) => {
    soundManager.playClick();
    setAiQuestion(promptText);
    setAiLoading(true);
    setAiResponse(null);
    setTimeout(() => {
      setAiLoading(false);
      if (isAr) {
        setAiResponse(
          `تحليل MBK Institutional Engine:\n• تم رصد كسر كاذب لشمعة 15m عند 20,430 مع سحب سيولة البائعين.\n• منطقة الدخول المؤكدة: 20,440 - 20,445.\n• وقف الخسارة الحاسم (SL): 20,380 (المستوى البنيوي).\n• الأهداف: TP1 = 20,500 (+60 pips) | TP2 = 20,560 (+120 pips).\n• معدل العائد للمخاطرة R:R = 1 : 2.4.`
        );
      } else {
        setAiResponse(
          `MBK Institutional Engine Breakdown:\n• Liquidity sweep confirmed below 20,430 on the 15m candle.\n• High-probability buy zone: 20,440 - 20,445.\n• Invalidation (SL): 20,380 (structural swing low).\n• Targets: TP1 = 20,500 (+60 pips) | TP2 = 20,560 (+120 pips).\n• Calculated Risk/Reward: 1 : 2.4.`
        );
      }
    }, 500);
  };

  const handleVirtualTrade = (type: 'BUY' | 'SELL') => {
    soundManager.playProfitChime();
    const pnlDelta = type === 'BUY' ? +240 : +160;
    setVirtualEquity((prev) => prev + pnlDelta);
    setVirtualTradesCount((prev) => prev + 1);
    setBacktestStep((prev) => (prev >= 9 ? 3 : prev + 1));
  };

  const handleOpenArticle = (art: ArticleData) => {
    soundManager.playClick();
    setActiveArticle(art);
    setArticleModalOpen(true);
  };

  // Workflow 5 Steps
  const workflowSteps = [
    {
      step: isAr ? '01 استعد' : '01 Prepare',
      title: isAr ? 'أفكار التداول الذكية والتحضير للسيولة' : 'AI Trade Ideas & Liquidity Preparation',
      desc: isAr
        ? 'الدخول ووقف الخسارة وأهداف الربح مع سجل نتائج منشور وموثق لحظة بلحظة.'
        : 'Entry, stop loss, and tiered take-profit targets with an audited real-time record.',
      pills: [
        { id: 'ideas', label: isAr ? 'أفكار التداول الذكية ↗' : 'AI trade ideas ↗' },
        { id: 'charts', label: isAr ? 'الرسوم البيانية ↗' : 'Market charts ↗' },
        { id: 'calendar', label: isAr ? 'التقويم الاقتصادي ↗' : 'Economic calendar ↗' },
        { id: 'liquidity', label: isAr ? 'خريطة السيولة ↗' : 'Liquidity map ↗' }
      ]
    },
    {
      step: isAr ? '02 تدرّب' : '02 Practise',
      title: isAr ? 'التداول التجريبي ومحاكاة السوق' : 'Paper Trading & Execution Practice',
      desc: isAr
        ? 'تدرّب برصيد افتراضي وراجع النتائج في بيئة تطابق الأسعار الحقيقية 100%.'
        : 'Practise with virtual money and review outcome in a 100% true-to-market simulation.',
      pills: [
        { id: 'paper', label: isAr ? 'التداول التجريبي ↗' : 'Paper trading ↗' },
        { id: 'backtest', label: isAr ? 'مختبر الاختبار التاريخي ↗' : 'Backtest Lab ↗' },
        { id: 'calculators', label: isAr ? 'حاسبات التداول ↗' : 'Trading calculators ↗' }
      ]
    },
    {
      step: isAr ? '03 دوّن' : '03 Journal',
      title: isAr ? 'يوميات التداول المؤسسية' : 'Institutional Trade Journaling',
      desc: isAr
        ? 'احفظ قراراتك وملاحظاتك ونتائج كل صفقة بصورة آلية مع لقطات الشارت.'
        : 'Keep the decisions, triggers, and post-trade reflections behind every single trade.',
      pills: [
        { id: 'journal', label: isAr ? 'يوميات التداول ↗' : 'Trading journal ↗' },
        { id: 'analytics', label: isAr ? 'تحليلات اليوميات ↗' : 'Journal analytics ↗' },
        { id: 'broker', label: isAr ? 'حساب الوسيط ↗' : 'Broker account ↗' }
      ]
    },
    {
      step: isAr ? '04 راجع' : '04 Review',
      title: isAr ? 'المستشار الذكي وتحليل الصور' : 'AI Advisor & Chart Vision',
      desc: isAr
        ? 'اسأل عن تداولك وأرسل الرسوم البيانية للحصول على تحليل هيكلي وموضوعي مكتوب.'
        : 'Ask about your setups and submit chart screenshots for written structural breakdown.',
      pills: [
        { id: 'advisor', label: isAr ? 'المستشار الذكي وتحليل الصور ↗' : 'AI Advisor & Chart Vision ↗' },
        { id: 'guardrails', label: isAr ? 'حارس الحساب المموّل ↗' : 'Prop Guardrails ↗' }
      ]
    },
    {
      step: isAr ? '05 استكشف' : '05 Explore',
      title: isAr ? 'أداء التداول ومجتمع المحترفين' : 'Performance Analytics & Pro Community',
      desc: isAr
        ? 'راجع سجل الاستراتيجيات ونسب التراجع وتنافس في دوري التداول الأسبوعي.'
        : 'Inspect strategy records, drawdown limits, and participate in weekly trading leagues.',
      pills: [
        { id: 'perf', label: isAr ? 'أداء أفكار التداول ↗' : 'Trade idea performance ↗' },
        { id: 'league', label: isAr ? 'دوري التداول ↗' : 'Trading League ↗' },
        { id: 'alerts', label: isAr ? 'تنبيهات الأسعار ↗' : 'Price alerts ↗' }
      ]
    }
  ];

  // 8 FAQs
  const faqs = [
    {
      q: isAr ? 'ما الذي تتضمنه باقة Free المجانية في MBKtrading؟' : 'What is included in MBKtrading’s Free plan?',
      a: isAr
        ? 'تتضمن الباقة المجانية حساب تداول تجريبي بـ $10,000، مفكرة تداول غير محدودة، أكاديمية التداول الكاملة (11 مستوى تعليمي)، الرسوم البيانية اللحظية، والتقويم الاقتصادي وحاسبات إدارة المخاطر دون أي بطاقة ائتمانية.'
        : 'The Free plan includes a $10,000 paper trading balance, unlimited trade journaling, the complete 11-level trading academy, live market charts, economic calendar, and risk calculators with zero credit card required.'
    },
    {
      q: isAr ? 'كيف يتم توثيق سجل النتائج (Audited Track Record)؟' : 'How is the Audited Track Record verified?',
      a: isAr
        ? 'كل إشارة تصدر عبر مؤشرات Pine Script المعتمدة (MBK Scalp Breakout & Alligator FVG) يتم تسجيلها بطابع زمني مشفر متزامن مع أسعار سيولة London LD4 وTradingView. النتائج معلنة بشفافية تامة دون تعديل تاريخي.'
        : 'Every trade generated through our verified Pine Script indicators (MBK Scalp Breakout & Alligator FVG) is timestamp-locked against London LD4 & TradingView institutional feeds, guaranteeing verifiable non-repudiation.'
    },
    {
      q: isAr ? 'هل الإشارات الآلية تشمل الذهب (XAUUSD) وناسداك (US100)؟' : 'Are signals available for Gold (XAUUSD) & Nasdaq (US100)?',
      a: isAr
        ? 'نعم! إشارات MBK Desk متخصصة بالدرجة الأولى في العقود الأكثر سيولة: مؤشر ناسداك 100 (US100)، والذهب (XAUUSD)، وزوج EUR/USD مع نقاط الدخول الدقيقة ووقف الخسارة وثلاثة أهداف ربح (TP1, TP2, TP3).'
        : 'Yes! MBK Desk focuses directly on high-liquidity assets: US100 (Nasdaq 100), XAUUSD (Gold), and EUR/USD, with precise entry, structural invalidation (SL), and tiered take-profit targets.'
    },
    {
      q: isAr ? 'كيف يعمل المستشار الذكي وتحليل الصور (AI Chart Vision)؟' : 'How does AI Advisor & Chart Vision work?',
      a: isAr
        ? 'يمكنك كتابة أي تساؤل استراتيجي أو رفع لقطة شاشة لأي رسم بياني من TradingView وسيقوم النموذج المؤسسي بقراءة الهيكل السعري، ومناطق العرض والطلب (FVG)، وتحديد مناطق سحب السيولة بدقة.'
        : 'You can query any strategic scenario or upload a TradingView chart screenshot; the AI engine visually maps price structure, Fair Value Gaps (FVGs), order blocks, and liquidity pools.'
    },
    {
      q: isAr ? 'ما هو حارس الحساب المموّل (Prop Guardrails)؟' : 'What are Prop Guardrails for funded traders?',
      a: isAr
        ? 'نظام أمان رقمي يحميك من خرق قواعد شركات التمويل (Prop Firms) مثل تراجع اليوم الأقصى (Max Daily Drawdown) وحجم اللوت المسموح، مع تنبيهات استباقية فورية عند اقترابك من حدود الخطر.'
        : 'A protective risk system that guards funded accounts against prop firm violations (daily drawdown, trailing max loss, max lot exposure) with proactive live threshold alerts.'
    },
    {
      q: isAr ? 'كيف يعمل التداول التجريبي (Paper Trading)؟' : 'How does Paper Trading protect my capital?',
      a: isAr
        ? 'يتيح لك اختبار استراتيجياتك والتمرن على إشارات MBK برأس مال افتراضي مطابق تماماً لبيئة السوق الحقيقية والسبريد المباشر، لتصقل انضباطك النفسي قبل تداول أموالك الحقيقية.'
        : 'Simulates real-world market execution with live quotes and spreads, enabling you to build edge and discipline with virtual capital before risking real funds.'
    },
    {
      q: isAr ? 'كيف أحصل على اشتراك VIP مجاني مدى الحياة عبر الوسيط الشريك؟' : 'How can I get free lifetime VIP via a partner broker?',
      a: isAr
        ? 'بكل سهولة: افتح حساباً عبر الوسيط المعتمد الشريك باستخدام رمز الشريك MBK-VIP-FREE وموّل حسابك لتبدأ التداول، وسيقوم فريقنا بتفعيل عضوية VIP الكاملة مجاناً 100% مدى الحياة.'
        : 'Simply open and fund an account with our regulated partner broker using partner code MBK-VIP-FREE to unlock full VIP privileges 100% free for life.'
    },
    {
      q: isAr ? 'هل توجد فلاتر للتداول المتوافق مع الشريعة الإسلامية (Swap-Free)؟' : 'Is there an Islamic Swap-Free filter?',
      a: isAr
        ? 'نعم، المنصة تدعم بشكل كامل المتداولين الباحثين عن حسابات إسلامية خالية من الفوائد الربوية (Swap-Free) ونوفر فلاتر للأصول المتوافقة والوسطاء المعتمدين الخالين من رسوم التبييت.'
        : 'Yes, MBK Desk fully supports Islamic Swap-Free accounts with zero overnight rollover interest and dedicated compliance filters for halal instruments.'
    }
  ];

  // 25-row comparison data
  const comparisonRows = [
    { name: isAr ? 'مفكرة التداول (Trading Journal)' : 'Trading Journal', free: '✓', pro: '✓', elite: '✓' },
    { name: isAr ? 'سعة صفقات المفكرة' : 'Journal Trade Capacity', free: '50/mo', pro: 'Unlimited', elite: 'Unlimited' },
    { name: isAr ? 'مختبر الاختبار التاريخي (Backtest Lab)' : 'Backtest Lab', free: '—', pro: '100 Candles', elite: 'Unlimited' },
    { name: isAr ? 'رأس مال التداول التجريبي (Paper Trading)' : 'Paper Trading Capital', free: '$10,000', pro: '$50,000', elite: '$250,000' },
    { name: isAr ? 'استشارات الذكاء الاصطناعي اليومية' : 'AI Advisor Daily Queries', free: '—', pro: '20 msg/day', elite: '100 msg/day' },
    { name: isAr ? 'تحليل صور الشارت (AI Chart Vision)' : 'AI Chart Vision Uploads', free: '—', pro: '3/week', elite: 'Unlimited' },
    { name: isAr ? 'أفكار التداول اللحظية (Trade Ideas)' : 'Live Trade Ideas', free: '—', pro: '3/week', elite: 'All Signals' },
    { name: isAr ? 'إشارات Pine Script الموثقة لحظياً' : 'Pine Script Webhook Signals', free: '—', pro: 'Delayed 15m', elite: 'Instant Real-Time' },
    { name: isAr ? 'حارس الحساب المموّل (Prop Guardrails)' : 'Prop Guardrails & Drawdown Alert', free: '—', pro: 'Basic', elite: 'Full Live Protection' },
    { name: isAr ? 'ربط الحسابات (Binance, Bybit, IBKR)' : 'Exchange Linking (Binance, IBKR)', free: '✓', pro: '✓', elite: '✓' },
    { name: isAr ? 'ربط منصات MT4 و MT5' : 'Direct MT4 / MT5 Account Sync', free: '—', pro: '—', elite: '✓' },
    { name: isAr ? 'التقويم الاقتصادي عالي التأثير' : 'High-Impact Economic Calendar', free: '✓', pro: '✓', elite: '✓' },
    { name: isAr ? 'أكاديمية التداول المؤسسية (11 مستوى)' : 'Institutional Trading Academy (11 lvls)', free: '✓', pro: '✓', elite: '✓' },
    { name: isAr ? 'دوري التداول الأسبوعي (Trading League)' : 'Weekly Trading League', free: '✓', pro: '✓', elite: '✓' },
    { name: isAr ? 'متابعة الحالة النفسية والانضباط' : 'Emotion & Psychology Check-ins', free: '✓', pro: '✓', elite: '✓' },
    { name: isAr ? 'تنبيهات الأسعار المخصصة (Price Alerts)' : 'Custom Price Alerts', free: '2', pro: '10', elite: 'Unlimited' },
    { name: isAr ? 'غرفة نقاش الأعضاء المعتمدين' : 'Member Discussion Community', free: '—', pro: '✓', elite: '✓' },
    { name: isAr ? 'قناة تيليجرام VIP الخاصة' : 'Private VIP Telegram Channel', free: '—', pro: '✓', elite: '✓' },
    { name: isAr ? 'جلسات توجيه أسبوعية مع كوتش AI' : 'Weekly AI Coaching & Strategy Review', free: '—', pro: '—', elite: '✓' },
    { name: isAr ? 'حاسبات العائد إلى المخاطرة واللوت' : 'Risk/Reward & Position Calculators', free: '✓', pro: '✓', elite: '✓' },
    { name: isAr ? 'تمركزات كبار المضاربين (COT Report)' : 'COT Positioning & Liquidity Heatmap', free: '—', pro: '—', elite: '✓' },
    { name: isAr ? 'تصدير البيانات بصيغة CSV وسحابي' : 'CSV Export & Cloud Backup', free: '—', pro: '✓', elite: '✓' },
    { name: isAr ? 'فلتر الحسابات الإسلامية (Swap-Free)' : 'Halal Swap-Free Market Filter', free: '✓', pro: '✓', elite: '✓' },
    { name: isAr ? 'الوصول لواجهة برمجية Webhook API' : 'Real-time Webhook API Access', free: '—', pro: '—', elite: '✓' },
    { name: isAr ? 'الدعم المؤسسي والأولوية 24/7' : '24/7 Dedicated Priority Support', free: 'Community', pro: 'Standard', elite: 'VIP Direct Desk' }
  ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#131722] text-[#d1d4dc] flex flex-col ${
        isAr ? "font-['Cairo',sans-serif]" : "font-['Plus_Jakarta_Sans',sans-serif]"
      } selection:bg-[#089981]/30 selection:text-[#089981]`}
    >
      {/* 1. TOP SINGLE CONTINUOUS TICKER TAPE (Zero external script errors) */}
      <HeaderTicker onSelectSymbol={(sym) => setHeroSymbol(sym === 'XAUUSD' ? 'XAUUSD' : 'US100')} lang={lang} />

      {/* 2. TOP INSTITUTIONAL NAVIGATION BAR WITH CENTER LINKS */}
      <header className="sticky top-0 z-40 bg-[#1e222d] border-b border-[#2a2e39] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={handleDemoClick}
            className="flex items-center gap-3 cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 rounded bg-white text-[#131722] flex items-center justify-center font-mono font-black text-sm tracking-wider">
              MBK
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base tracking-tight font-mono">
                MBK TRADING
              </span>
              <span className="text-[10px] text-[#787b86] font-mono tracking-wider -mt-1">
                {isAr ? 'منصة التداول المؤسسي' : 'DESK + INTELLIGENCE'}
              </span>
            </div>
          </div>

          {/* Centered Navigation Links (Visible on md: and up) */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs font-semibold text-[#787b86]">
            <a href="#desk-preview" className="hover:text-white transition-colors">
              {isAr ? 'غرفة الأسواق' : 'Desk'}
            </a>
            <a href="#workflow" className="hover:text-white transition-colors">
              {isAr ? 'كيف تعمل المنصة' : 'Workflow'}
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              {isAr ? 'المميزات' : 'Features'}
            </a>
            <a href="#track-record" className="hover:text-white transition-colors">
              {isAr ? 'سجل النتائج' : 'Track Record'}
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              {isAr ? 'الأسعار' : 'Pricing'}
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
            </a>
          </nav>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              className="px-2 sm:px-2.5 py-1.5 rounded bg-[#2a2e39] hover:bg-[#363a45] text-xs font-bold text-white border border-[#363a45] transition-colors cursor-pointer flex items-center gap-1"
              title={isAr ? 'Switch to English' : 'التحويل للعربية'}
            >
              <Globe className="w-3.5 h-3.5 text-[#089981]" />
              <span className="hidden sm:inline">{isAr ? '🇬🇧 English' : '🇸🇦 العربية'}</span>
              <span className="sm:hidden font-mono text-[11px]">{isAr ? 'EN' : 'عربي'}</span>
            </button>

            {/* VIP Code Button */}
            <button
              onClick={handlePromoClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] hover:text-white border border-[#363a45] text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#089981]"></span>
              <span>{isAr ? 'تفعيل VIP' : 'VIP Code'}</span>
            </button>

            {/* Sign In */}
            <button
              onClick={() => handleAuthClick('login')}
              className="px-2 sm:px-3 py-1.5 rounded text-xs font-semibold text-[#d1d4dc] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer whitespace-nowrap"
            >
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </button>

            {/* Launch MBK Desk ↗ */}
            <button
              onClick={handleDemoClick}
              className="px-2.5 sm:px-4 py-1.5 rounded bg-white text-[#131722] hover:bg-[#d1d4dc] text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <span>{isAr ? 'MBK Desk ↗' : 'Launch Desk ↗'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO + LIVE WEB TERMINAL PREVIEW (#desk-preview) */}
      <section className="relative pt-10 pb-16 md:pt-14 md:pb-20 border-b border-[#2a2e39] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e222d] border border-[#2a2e39] text-xs font-medium text-[#d1d4dc] mb-4">
            <span className="w-2 h-2 rounded-full bg-[#089981] animate-ping" />
            <span>
              {isAr
                ? '🟢 مباشر • يثق بنا 43,000+ متداول حول العالم'
                : '🟢 LIVE • Trusted by 43,000+ traders worldwide'}
            </span>
          </div>

          {/* Eyebrow */}
          <div className="text-xs font-mono font-bold tracking-widest text-[#787b86] uppercase mb-3">
            {isAr
              ? 'منصة تداول بالذكاء الاصطناعي / الهاتف والمكتب'
              : 'AI TRADING PLATFORM / DESK + INTELLIGENCE'}
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto mb-5">
            {isAr ? 'ابنِ روتين تداول أكثر وضوحًا.' : 'Build a better trading routine.'}
          </h1>

          {/* Sub-headline */}
          <p className="text-sm sm:text-base md:text-lg text-[#787b86] max-w-2xl mx-auto leading-relaxed mb-8">
            {isAr
              ? 'دوّن صفقاتك، وتدرّب دون المخاطرة بأموالك، وراجع قراراتك بالذكاء الاصطناعي—كل ذلك على منصة MBK Desk.'
              : 'Journal your trades, practise without risking money, and review your decisions with AI—all on MBK Desk.'}
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-10">
            <button
              onClick={() => handleAuthClick('signup')}
              className="px-6 py-3 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              {isAr ? 'ابدأ مجاناً' : 'Start Free'}
            </button>

            <button
              onClick={handleDemoClick}
              className="px-5 py-3 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-white border border-[#363a45] hover:border-white font-semibold text-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{isAr ? 'افتح MBK Desk ↗' : 'Launch MBK Desk ↗'}</span>
            </button>

            <button
              onClick={handlePromoClick}
              className="px-4 py-3 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#d1d4dc] hover:text-white border border-[#2a2e39] hover:border-[#363a45] text-sm font-semibold transition-all cursor-pointer flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#089981]" />
              <span>{isAr ? 'تفعيل VIP برمز' : 'VIP Promo Code'}</span>
            </button>

            <a
              href="#workflow"
              className="px-4 py-3 text-xs sm:text-sm text-[#787b86] hover:text-white transition-colors"
            >
              {isAr ? 'استكشف المنصة ↓' : 'Explore Platform ↓'}
            </a>
          </div>

          {/* INTERACTIVE APP FRAME (MBK DESK TERMINAL) (#desk-preview) */}
          <div
            id="desk-preview"
            className="relative mx-auto max-w-5xl rounded-xl bg-[#1e222d] border border-[#2a2e39] p-3 sm:p-5 shadow-2xl text-start"
          >
            {/* Terminal Window Header Bar (Pure Desktop Focus) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2e39] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#363a45] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#363a45] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#363a45] inline-block" />
                <span className="text-xs font-mono text-[#787b86] ms-2">
                  app.mbktrading.io • MBK Desk v4.2
                </span>
              </div>

              {/* 4 Main Interactive Tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2a2e39] text-xs font-semibold">
                <button
                  onClick={() => setHeroTab('live_desk')}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                    heroTab === 'live_desk' ? 'bg-[#2a2e39] text-white' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  {isAr ? 'غرفة الأسواق والشارت' : 'Live Market Desk'}
                </button>
                <button
                  onClick={() => setHeroTab('signals')}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                    heroTab === 'signals' ? 'bg-[#2a2e39] text-white' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  {isAr ? 'إشارات التداول الذكية' : 'Live Webhook Signals'}
                </button>
                <button
                  onClick={() => setHeroTab('ai_advisor')}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                    heroTab === 'ai_advisor' ? 'bg-[#2a2e39] text-white' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  {isAr ? 'المستشار الذكي' : 'AI Trade Advisor'}
                </button>
                <button
                  onClick={() => setHeroTab('backtest')}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                    heroTab === 'backtest' ? 'bg-[#2a2e39] text-white' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  {isAr ? 'مختبر الباك تيست' : 'Backtest & Paper Lab'}
                </button>
              </div>
            </div>

            {/* TAB 1: Live Market Desk with Working Quick Lot Size Calculator */}
            {heroTab === 'live_desk' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2e39] pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHeroSymbol('US100')}
                      className={`px-3 py-1 rounded font-mono font-bold cursor-pointer transition-colors ${
                        heroSymbol === 'US100' ? 'bg-white text-[#131722]' : 'bg-[#2a2e39] text-[#787b86]'
                      }`}
                    >
                      US100 (ناسداك)
                    </button>
                    <button
                      onClick={() => setHeroSymbol('XAUUSD')}
                      className={`px-3 py-1 rounded font-mono font-bold cursor-pointer transition-colors ${
                        heroSymbol === 'XAUUSD' ? 'bg-white text-[#131722]' : 'bg-[#2a2e39] text-[#787b86]'
                      }`}
                    >
                      XAUUSD (الذهب)
                    </button>
                    <span dir="ltr" className="font-mono text-[#089981] font-bold text-xs inline-block">
                      {heroSymbol === 'US100' ? '20,565.40 (+0.82%)' : '2,684.20 (+0.64%)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#089981] bg-[#089981]/10 px-2 py-0.5 rounded border border-[#089981]/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
                      <span>{isAr ? 'جلسة نيويورك ولندن (Overlap)' : 'London/NY Overlap'}</span>
                    </span>
                  </div>
                </div>

                {/* Split View: Candlestick Canvas & Lot Calculator */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Chart canvas */}
                  <div className="lg:col-span-8 bg-[#131722] border border-[#2a2e39] rounded-lg p-4 h-64 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#2a2e39] pb-2">
                      <span className="text-[#089981] font-bold">
                        {heroSymbol === 'US100' ? 'BUY US100 @ 20,442.00' : 'BUY XAUUSD @ 2,668.50'}
                      </span>
                      <span dir="ltr" className="text-[#089981] font-bold inline-block font-mono">
                        {heroSymbol === 'US100' ? '+123.4 Pips' : '+164 Pips'}
                      </span>
                    </div>

                    {/* Candlesticks */}
                    <div className="flex items-end justify-between h-36 px-4">
                      {[
                        { h: 32, up: true, w: 42 },
                        { h: 48, up: true, w: 60 },
                        { h: 28, up: false, w: 38 },
                        { h: 55, up: true, w: 68 },
                        { h: 72, up: true, w: 85 },
                        { h: 64, up: true, w: 80 },
                        { h: 40, up: false, w: 55 },
                        { h: 88, up: true, w: 98 },
                        { h: 105, up: true, w: 120 }
                      ].map((bar, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div
                            style={{ height: `${bar.w}px` }}
                            className={`w-[1.5px] ${bar.up ? 'bg-[#089981]' : 'bg-[#f23645]'}`}
                          />
                          <div
                            style={{ height: `${bar.h}px` }}
                            className={`w-4 sm:w-6 -mt-8 rounded-xs ${
                              bar.up ? 'bg-[#089981]' : 'bg-[#f23645]'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#787b86] border-t border-[#2a2e39] pt-2">
                      <span>MBK Precision Ribbon v3.4</span>
                      <span className="text-[#089981]">Targets 1 & 2 Completed ✓</span>
                    </div>
                  </div>

                  {/* Working Quick Lot Size Calculator */}
                  <div className="lg:col-span-4 bg-[#131722] border border-[#2a2e39] rounded-lg p-3.5 flex flex-col justify-between text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2a2e39] pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-[#089981]" />
                        <span>{isAr ? 'حاسبة اللوت وإدارة المخاطر' : 'Lot Size & Risk Calc'}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#787b86]">Live Tool</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#787b86]">{isAr ? 'رصيد الحساب ($):' : 'Balance ($):'}</span>
                        <input
                          type="number"
                          value={calcBalance}
                          onChange={(e) => setCalcBalance(Number(e.target.value) || 0)}
                          className="w-24 bg-[#1e222d] border border-[#363a45] rounded px-2 py-0.5 text-end text-white font-mono"
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#787b86]">{isAr ? 'نسبة المخاطرة (%):' : 'Risk (%):'}</span>
                        <input
                          type="number"
                          step="0.5"
                          value={calcRiskPercent}
                          onChange={(e) => setCalcRiskPercent(Number(e.target.value) || 0)}
                          className="w-24 bg-[#1e222d] border border-[#363a45] rounded px-2 py-0.5 text-end text-white font-mono"
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#787b86]">{isAr ? 'وقف الخسارة (نقاط):' : 'Stop Loss (Pips):'}</span>
                        <input
                          type="number"
                          value={calcStopLossPips}
                          onChange={(e) => setCalcStopLossPips(Number(e.target.value) || 1)}
                          className="w-24 bg-[#1e222d] border border-[#363a45] rounded px-2 py-0.5 text-end text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#1e222d] border border-[#2a2e39] flex justify-between items-center font-mono">
                      <span className="text-[#787b86] text-[11px]">{isAr ? 'حجم اللوت الموصى به:' : 'Optimal Lot:'}</span>
                      <span dir="ltr" className="text-white font-bold text-sm inline-block tabular-nums">
                        {calculatedLotSize} Lot
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-[#787b86] border-t border-[#2a2e39] pt-1">
                      <span>{isAr ? 'المخاطرة بالدولار:' : 'Max Dollar Risk:'}</span>
                      <span dir="ltr" className="text-[#f23645] font-mono font-bold inline-block tabular-nums">
                        -${calculatedDollarRisk.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Live Webhook Signals with working Copy Toast */}
            {heroTab === 'signals' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3 text-xs">
                  <span className="font-bold text-white font-mono">
                    {isAr ? 'إشارات Pine Script المعتمدة (Webhook)' : 'Verified Pine Script Webhook Signals'}
                  </span>
                  {copiedSignalText && (
                    <span className="text-[#089981] font-mono font-bold animate-pulse">
                      {copiedSignalText}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="bg-[#131722] border border-[#2a2e39] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded bg-[#089981]/20 text-[#089981] border border-[#089981]/40 font-bold">
                        BUY
                      </span>
                      <span className="font-bold text-white text-base">US100</span>
                      <span dir="ltr" className="text-[#787b86] inline-block font-mono">@ 20,440.00</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span>TP1: 20,500</span>
                      <span>TP2: 20,560</span>
                      <span className="text-[#f23645]">SL: 20,380</span>
                      <span dir="ltr" className="text-[#089981] font-bold inline-block font-mono">+120 Pips 🎯</span>
                    </div>

                    <button
                      onClick={() => handleCopyLevels('BUY US100 @ 20,440 | TP1: 20,500 | TP2: 20,560 | SL: 20,380')}
                      className="px-3 py-1.5 rounded bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نسخ مستويات الصفقة' : 'Copy Levels'}</span>
                    </button>
                  </div>

                  <div className="bg-[#131722] border border-[#2a2e39] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded bg-[#089981]/20 text-[#089981] border border-[#089981]/40 font-bold">
                        BUY
                      </span>
                      <span className="font-bold text-white text-base">XAUUSD (الذهب)</span>
                      <span dir="ltr" className="text-[#787b86] inline-block font-mono">@ 2,668.50</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span>TP1: 2,676.0</span>
                      <span>TP2: 2,684.9</span>
                      <span className="text-[#f23645]">SL: 2,658.0</span>
                      <span dir="ltr" className="text-[#089981] font-bold inline-block font-mono">+164 Pips 🎯</span>
                    </div>

                    <button
                      onClick={() => handleCopyLevels('BUY XAUUSD @ 2,668.50 | TP1: 2,676.0 | TP2: 2,684.9 | SL: 2,658.0')}
                      className="px-3 py-1.5 rounded bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نسخ مستويات الصفقة' : 'Copy Levels'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AI Trade Advisor with Preset Clickable Questions */}
            {heroTab === 'ai_advisor' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3 text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#089981]" />
                    <span>MBK Quantitative AI Advisor</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#089981]">Gemini 2.5 Flash Online</span>
                </div>

                {/* Preset Clickable Prompts */}
                <div className="flex flex-wrap gap-2">
                  {[
                    isAr ? 'تحليل الذهب XAUUSD الآن' : 'Analyze Gold XAUUSD now',
                    isAr ? 'حساب مخاطرة صفقة ناسداك' : 'Calculate US100 trade risk',
                    isAr ? 'ما هي مناطق السيولة لليوم؟' : 'Today liquidity roadmap'
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSimulateAiPrompt(p)}
                      className="px-3 py-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] text-xs text-[#d1d4dc] border border-[#363a45] transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="bg-[#131722] border border-[#2a2e39] rounded-lg p-4 h-48 overflow-y-auto text-xs space-y-2">
                  <div className="text-[#787b86]">
                    <span className="font-bold text-white">{isAr ? 'الاستفسار: ' : 'Query: '}</span>
                    {aiQuestion}
                  </div>

                  {aiLoading ? (
                    <div className="text-xs text-[#089981] animate-pulse py-2">
                      {isAr ? 'جارِ فحص الشارت وتفكيك الهيكل السعري...' : 'Analyzing price action & order blocks...'}
                    </div>
                  ) : (
                    <div className="text-[#d1d4dc] whitespace-pre-line text-xs leading-relaxed border-t border-[#2a2e39] pt-2">
                      {aiResponse ||
                        (isAr
                          ? 'انقر فوق أي من الأسئلة المقترحة أعلاه للحصول على تفكيك فوري لمناطق الدخول والسيولة ووقف الخسارة.'
                          : 'Click any preset question above to generate an immediate algorithmic breakdown.')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: Backtest & Paper Lab with Virtual Buy/Sell Buttons */}
            {heroTab === 'backtest' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2e39] pb-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white font-mono">
                      {isAr ? 'رأس المال الافتراضي:' : 'Virtual Equity:'}
                    </span>
                    <span dir="ltr" className="text-sm font-bold text-[#089981] font-mono inline-block tabular-nums">
                      ${virtualEquity.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-mono text-[#787b86]">
                      {virtualTradesCount} {isAr ? 'صفقات' : 'trades'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVirtualTrade('BUY')}
                      className="px-3 py-1 rounded bg-[#089981] hover:bg-[#089981]/90 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      {isAr ? '+ اختبار شراء BUY' : '+ Test BUY'}
                    </button>
                    <button
                      onClick={() => handleVirtualTrade('SELL')}
                      className="px-3 py-1 rounded bg-[#f23645] hover:bg-[#f23645]/90 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      {isAr ? '+ اختبار بيع SELL' : '+ Test SELL'}
                    </button>
                    <button
                      onClick={() => {
                        setVirtualEquity(10000);
                        setVirtualTradesCount(0);
                        setBacktestStep(3);
                      }}
                      className="p-1 rounded bg-[#2a2e39] hover:bg-[#363a45] text-[#787b86] hover:text-white cursor-pointer"
                      title={isAr ? 'إعادة تعيين المحاكاة' : 'Reset Simulator'}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-[#131722] border border-[#2a2e39] rounded-lg p-4 h-48 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#787b86]">
                      {isAr ? 'معدل النجاح المحاكى: 84.5%' : 'Simulated Win Rate: 84.5%'}
                    </span>
                    <span dir="ltr" className="text-[#089981] font-bold inline-block font-mono">
                      +1,420 Pips Verified
                    </span>
                  </div>

                  {/* Equity Bars */}
                  <div className="flex items-end gap-2 h-24 px-2">
                    {[15, 25, 20, 38, 45, 42, 60, 75, 70, 95, 110, 105, 130].map((v, i) => (
                      <div
                        key={i}
                        style={{ height: `${Math.min(100, v * 0.7)}%` }}
                        className={`flex-1 rounded-t-xs transition-all ${
                          i <= backtestStep ? 'bg-[#089981]' : 'bg-[#2a2e39]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-[#787b86] border-t border-[#2a2e39] pt-2">
                    <span>{isAr ? 'انقر فوق اختبار شراء/بيع لتحديث الرصيد الافتراضي ومسار الأرباح' : 'Click Test BUY/SELL to simulate live equity updates'}</span>
                    <button onClick={handleDemoClick} className="text-white hover:underline font-bold">
                      {isAr ? 'فتح المحاكي الكامل ↗' : 'Open Full Lab ↗'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Frame Footer Caption */}
            <div className="mt-4 pt-3 border-t border-[#2a2e39] text-center text-xs text-[#787b86]">
              {isAr
                ? 'غرفة الأسواق والشارت · صورة تفاعلية فعلية للتطبيق · الميزات حسب باقتك'
                : 'Market Desk · Live Interactive Product Frame · Features depend on plan'}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: `MBK / WORKFLOW` — 5-STEP INTERACTIVE WORKSPACE (#workflow) */}
      <section id="workflow" className="py-16 md:py-20 border-b border-[#2a2e39] bg-[#131722]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="font-mono text-xs font-bold text-[#089981] uppercase tracking-wider block mb-2">
              MBK / WORKFLOW
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
              {isAr
                ? 'روتين تداول متكامل. مساحة عمل واحدة.'
                : 'A complete trading routine. One connected workspace.'}
            </h2>
            <p className="text-sm text-[#787b86]">
              {isAr
                ? 'اختر خطوة. استكشف الأدوات. شاهد التطبيق الحقيقي فورياً.'
                : 'Choose a step. Explore the tools. See the actual app immediately.'}
            </p>
          </div>

          {/* 5 Main Step Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {workflowSteps.map((ws, idx) => (
              <button
                key={idx}
                onClick={() => {
                  soundManager.playClick();
                  setActiveWorkflowStep(idx);
                  setActiveWorkflowPill(ws.pills[0].id);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  activeWorkflowStep === idx
                    ? 'bg-white text-[#131722]'
                    : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
                }`}
              >
                {ws.step}
              </button>
            ))}
          </div>

          {/* Workflow Interactive Box */}
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-6 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Details & Sub-Pills */}
              <div className="lg:col-span-5 space-y-5">
                <div>
                  <span className="text-xs font-mono text-[#089981] font-bold">
                    {workflowSteps[activeWorkflowStep].step}
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {workflowSteps[activeWorkflowStep].title}
                  </h3>
                  <p className="text-sm text-[#787b86] mt-2 leading-relaxed">
                    {workflowSteps[activeWorkflowStep].desc}
                  </p>
                </div>

                {/* Sub-Pills */}
                <div>
                  <span className="text-xs text-[#787b86] block mb-2">
                    {isAr ? 'الأدوات المتصلة بهذه الخطوة:' : 'Connected tools in this step:'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {workflowSteps[activeWorkflowStep].pills.map((pill) => (
                      <button
                        key={pill.id}
                        onClick={() => {
                          soundManager.playClick();
                          setActiveWorkflowPill(pill.id);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                          activeWorkflowPill === pill.id
                            ? 'bg-[#2a2e39] text-white border border-white'
                            : 'bg-[#131722] text-[#787b86] hover:text-white border border-[#2a2e39]'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDemoClick}
                    className="px-5 py-2.5 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isAr ? 'جرّب هذه الخطوة في MBK Desk ↗' : 'Experience in MBK Desk ↗'}
                  </button>
                </div>
              </div>

              {/* Right Column: Dynamic Live Preview Panel */}
              <div className="lg:col-span-7 bg-[#131722] border border-[#2a2e39] rounded-lg p-5 min-h-[280px] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3 text-xs font-mono">
                  <span className="text-white font-bold">
                    {isAr ? 'معاينة الأداة: ' : 'Live Tool Preview: '} {activeWorkflowPill.toUpperCase()}
                  </span>
                  <span className="text-[#089981] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#089981]" />
                    <span>Real-time Sync</span>
                  </span>
                </div>

                {/* Sub-pill visual state */}
                <div className="py-4 text-xs text-[#d1d4dc] space-y-3 font-mono">
                  {activeWorkflowPill === 'ideas' && (
                    <div className="space-y-2">
                      <div className="p-3 bg-[#1e222d] rounded border border-[#2a2e39] flex justify-between items-center">
                        <span className="text-[#089981] font-bold">BUY US100 @ 20,440.00</span>
                        <span dir="ltr" className="inline-block font-mono">TP1: 20,500 (+60) • TP2: 20,560 (+120)</span>
                      </div>
                      <div className="p-3 bg-[#1e222d] rounded border border-[#2a2e39] flex justify-between items-center">
                        <span className="text-[#089981] font-bold">BUY XAUUSD @ 2,668.50</span>
                        <span dir="ltr" className="inline-block font-mono">TP1: 2,676.0 • TP2: 2,684.9 (+164)</span>
                      </div>
                    </div>
                  )}

                  {activeWorkflowPill === 'charts' && (
                    <div className="h-36 flex flex-col items-center justify-center border border-dashed border-[#363a45] rounded text-center p-4">
                      <span className="text-[#089981] font-bold mb-1">M5 Scalp Engine Ribbon Active</span>
                      <p className="text-[#787b86]">
                        {isAr
                          ? 'عرض الرسوم البيانية الفورية مع شريط السيولة ومؤشر MBK Precision Ribbon v3.4'
                          : 'Full candlestick display with liquidity ribbons & volume profile'}
                      </p>
                    </div>
                  )}

                  {activeWorkflowPill === 'calendar' && (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-[#1e222d] rounded border border-[#2a2e39] flex justify-between items-center">
                        <span className="text-white font-bold">US Core CPI (MoM)</span>
                        <span className="text-[#089981] font-mono">Forecast 0.3% • High Impact</span>
                      </div>
                      <div className="p-2.5 bg-[#1e222d] rounded border border-[#2a2e39] flex justify-between items-center">
                        <span className="text-white font-bold">Fed Interest Rate Decision</span>
                        <span className="text-[#787b86] font-mono">5.25% • Unchanged</span>
                      </div>
                    </div>
                  )}

                  {activeWorkflowPill === 'paper' && (
                    <div className="p-4 bg-[#1e222d] rounded border border-[#2a2e39] text-center space-y-2">
                      <span className="text-2xl font-bold text-[#089981] font-mono">$10,000.00</span>
                      <p className="text-[#787b86] text-xs">
                        {isAr ? 'رصيد افتراضي نشط لاختبار الاستراتيجيات' : 'Active virtual trading account for risk-free execution'}
                      </p>
                    </div>
                  )}

                  {activeWorkflowPill === 'journal' && (
                    <div className="p-3 bg-[#1e222d] rounded border border-[#2a2e39] space-y-1.5">
                      <div className="flex justify-between text-white font-bold">
                        <span>Trade #1042 — US100 Scalp</span>
                        <span dir="ltr" className="text-[#089981] inline-block font-mono">+120 Pips</span>
                      </div>
                      <p className="text-[#787b86] text-[11px]">
                        {isAr ? 'السبب: ارتداد من Fair Value Gap مع سحب سيولة قاع لندن' : 'Trigger: FVG rejection with London low sweep'}
                      </p>
                    </div>
                  )}

                  {activeWorkflowPill !== 'ideas' &&
                    activeWorkflowPill !== 'charts' &&
                    activeWorkflowPill !== 'calendar' &&
                    activeWorkflowPill !== 'paper' &&
                    activeWorkflowPill !== 'journal' && (
                      <div className="p-4 bg-[#1e222d] rounded border border-[#2a2e39] space-y-2">
                        <div className="flex justify-between text-white font-bold">
                          <span>MBK Modular Station</span>
                          <span className="text-[#089981]">Active</span>
                        </div>
                        <p className="text-[#787b86] text-xs">
                          {isAr
                            ? 'تم تجهيز وحدة العمل بالكامل وربطها بمحرك الديسك وسجل النتائج.'
                            : 'Tool module connected to desk engine and cloud telemetry.'}
                        </p>
                      </div>
                    )}
                </div>

                <div className="border-t border-[#2a2e39] pt-3 text-[11px] text-[#787b86] flex justify-between">
                  <span>MBK Desk Engine v4.2</span>
                  <span className="text-white">100% Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: `المميزات الشاملة (#features)` — 01 TO 06 SHOWCASE CARDS */}
      <section id="features" className="py-16 md:py-20 border-b border-[#2a2e39] bg-[#131722]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="font-mono text-xs font-bold text-[#089981] uppercase tracking-wider block mb-2">
              {isAr ? 'المميزات الشاملة' : 'CORE CAPABILITIES'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              {isAr ? 'كل ما تحتاجه للتداول بثقة' : 'Everything you need to trade with confidence'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-[#787b86]">01 / MBK</span>
                  <div className="flex gap-1 bg-[#131722] p-0.5 rounded text-[11px]">
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 1: 0 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[1] === 0 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'يوميات التداول' : 'Journal'}
                    </button>
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 1: 1 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[1] === 1 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'تحليلات اليوميات' : 'Analytics'}
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {isAr ? 'يوميات التداول المؤسسية' : 'Institutional Trading Journal'}
                </h3>
                <p className="text-xs text-[#787b86] leading-relaxed mb-4">
                  {featureTabs[1] === 0
                    ? isAr
                      ? 'احتفظ بلقطات الشارت، وأسباب الدخول، والدروس المستفادة لكل صفقة بصورة آلية مع مزامنة سحابية.'
                      : 'Log screenshots, trade triggers, and lessons behind every execution with instant cloud sync.'
                    : isAr
                    ? 'اكتشف معدل ربحيتك حسب أيام الأسبوع وساعات الجلسة واستراتيجيات الدخول الأكثر إنتاجية.'
                    : 'Discover your expectancy by weekday, market session, and highest-yielding execution setups.'}
                </p>
              </div>
              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] text-[11px] font-mono text-[#089981]">
                ✓ {isAr ? 'سجل غير محدود للصفقات' : 'Unlimited trade archive'}
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-[#787b86]">02 / MBK</span>
                  <div className="flex gap-1 bg-[#131722] p-0.5 rounded text-[11px]">
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 2: 0 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[2] === 0 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'المستشار الذكي' : 'AI Advisor'}
                    </button>
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 2: 1 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[2] === 1 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'مراجعة اليوميات' : 'AI Review'}
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {isAr ? 'المستشار الذكي وتحليل الصور' : 'AI Advisor & Chart Vision'}
                </h3>
                <p className="text-xs text-[#787b86] leading-relaxed mb-4">
                  {featureTabs[2] === 0
                    ? isAr
                      ? 'ارفع لقطة شاشة لأي شارت وسيقوم الذكاء الاصطناعي بتحديد الفجوات السعرية (FVG) والسيولة.'
                      : 'Send any TradingView chart screenshot and let AI pinpoint liquidity pools & order blocks.'
                    : isAr
                    ? 'مراجعة أسبوعية من الذكاء الاصطناعي تحدد أخطاء التداول المتكررة وكيفية تفاديها.'
                    : 'Weekly algorithmic audit highlighting recurring mistakes and risk leakages.'}
                </p>
              </div>
              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] text-[11px] font-mono text-[#089981]">
                ✓ {isAr ? 'تحليل فوري للشارت بدقة عالية' : 'Instant vision analysis'}
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-[#787b86]">03 / MBK</span>
                  <div className="flex gap-1 bg-[#131722] p-0.5 rounded text-[11px]">
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 3: 0 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[3] === 0 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'أفكار التداول' : 'Trade Ideas'}
                    </button>
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 3: 1 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[3] === 1 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'أداء الأفكار' : 'Performance'}
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {isAr ? 'أفكار التداول الذكية' : 'AI Trade Ideas'}
                </h3>
                <p className="text-xs text-[#787b86] leading-relaxed mb-4">
                  {featureTabs[3] === 0
                    ? isAr
                      ? 'إشارات دخول حية لناسداك والذهب عبر مؤشرات باين سكريبت المؤسسية مع وقف خسارة وأهداف ربح.'
                      : 'Live entry, stop loss, and tiered take-profit signals for US100 & Gold.'
                    : isAr
                    ? 'سجل نتائج معلن ومحدث لحظياً يثبت نسبة نجاح تتجاوز 84.5% ومعدل 1:2.4 R:R.'
                    : 'Audited public record proving 84.5% win rate and strict 1 : 2.4 R:R.'}
                </p>
              </div>
              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] text-[11px] font-mono text-[#089981]">
                ✓ {isAr ? 'إشارات فورية عبر Webhook وتيليجرام' : 'Instant Webhook & Telegram alerts'}
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-[#787b86]">04 / MBK</span>
                  <div className="flex gap-1 bg-[#131722] p-0.5 rounded text-[11px]">
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 4: 0 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[4] === 0 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'مختبر الباك تيست' : 'Backtest Lab'}
                    </button>
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 4: 1 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[4] === 1 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'التداول التجريبي' : 'Paper Trading'}
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {isAr ? 'مختبر الاختبار والتداول الافتراضي' : 'Backtest Lab & Paper Trading'}
                </h3>
                <p className="text-xs text-[#787b86] leading-relaxed mb-4">
                  {featureTabs[4] === 0
                    ? isAr
                      ? 'أعد تشغيل الشموع التاريخية شمعة بشمعة واختبر استراتيجياتك في بيئة آمنة.'
                      : 'Replay historical candles bar-by-bar and backtest your edge without risk.'
                    : isAr
                    ? 'تدرّب برصيد افتراضي يصل إلى $250,000 في بيئة تطابق الأسعار المباشرة تماماً.'
                    : 'Practise with up to $250,000 virtual balance in true live market conditions.'}
                </p>
              </div>
              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] text-[11px] font-mono text-[#089981]">
                ✓ {isAr ? 'إعادة تشغيل غير محدودة للشموع' : 'Unlimited candle replay'}
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-[#787b86]">05 / MBK</span>
                  <div className="flex gap-1 bg-[#131722] p-0.5 rounded text-[11px]">
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 5: 0 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[5] === 0 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'حارس التمويل' : 'Prop Guardrails'}
                    </button>
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 5: 1 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[5] === 1 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'حساب الوسيط' : 'Broker Sync'}
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {isAr ? 'حارس الحساب المموّل وإدارة المخاطر' : 'Prop Guardrails & Risk Control'}
                </h3>
                <p className="text-xs text-[#787b86] leading-relaxed mb-4">
                  {featureTabs[5] === 0
                    ? isAr
                      ? 'مراقبة آلية لحدود التراجع اليومي الأقصى (Max Daily Drawdown) لضمان عدم خرق حسابات التمويل.'
                      : 'Automated monitoring of maximum daily drawdown to safeguard funded challenges.'
                    : isAr
                    ? 'اربط حساب الوسيط المعتمد وشاهد الرصيد وحجم الصفقات وتفاصيل الهامش في شاشة موحدة.'
                    : 'Connect broker balances, active positions, and margin usage in one unified desk.'}
                </p>
              </div>
              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] text-[11px] font-mono text-[#089981]">
                ✓ {isAr ? 'تنبيهات استباقية قبل خرق القواعد' : 'Proactive safety alerts'}
              </div>
            </div>

            {/* Card 6 */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-[#787b86]">06 / MBK</span>
                  <div className="flex gap-1 bg-[#131722] p-0.5 rounded text-[11px]">
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 6: 0 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[6] === 0 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'الأكاديمية' : 'Academy'}
                    </button>
                    <button
                      onClick={() => setFeatureTabs({ ...featureTabs, 6: 1 })}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        featureTabs[6] === 1 ? 'bg-[#2a2e39] text-white font-bold' : 'text-[#787b86]'
                      }`}
                    >
                      {isAr ? 'دوري التداول' : 'Trading League'}
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {isAr ? 'أكاديمية التداول ودوري المتداولين' : 'Trading Academy & League'}
                </h3>
                <p className="text-xs text-[#787b86] leading-relaxed mb-4">
                  {featureTabs[6] === 0
                    ? isAr
                      ? '11 مستوى تعليمي من أساسيات السوق حتى استراتيجيات صناع السوق وسيولة المؤسسات الكبرى.'
                      : '11 comprehensive institutional levels from market basics to smart money concepts.'
                    : isAr
                    ? 'تنافس في الدوري الأسبوعي للمتداولين واصعد في لوحة المتصدرين وحقق مكافآت حقيقية.'
                    : 'Compete in the weekly trading league, climb the leaderboard, and earn recognition.'}
                </p>
              </div>
              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] text-[11px] font-mono text-[#089981]">
                ✓ {isAr ? 'محتوى مؤسسي شامل ومجاني' : 'Comprehensive free academy'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: `سجل النتائج الموثق (#track-record)` */}
      <section id="track-record" className="py-16 md:py-20 border-b border-[#2a2e39] bg-[#131722]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="font-mono text-xs font-bold text-[#089981] uppercase tracking-wider block mb-2">
              AUDITED & VERIFIED PERFORMANCE
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
              {isAr ? 'سجل النتائج الموثق بالكامل' : 'Audited & Verified Track Record'}
            </h2>
            <p className="text-sm text-[#787b86]">
              {isAr
                ? 'شفافية حقيقية 100%. كل إشارة مسجلة ومعلنة مع نقاط الدخول ووقف الخسارة.'
                : '100% genuine transparency. Every signal recorded with entry, SL and target hits.'}
            </p>
          </div>

          {/* 4 Stat Cards with Forced LTR Numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className="p-5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-center">
              <span className="text-xs font-mono text-[#787b86] block mb-1">
                {isAr ? 'إجمالي النقاط المحققة' : 'Total Verified Pips'}
              </span>
              <div dir="ltr" className="text-3xl sm:text-4xl font-black font-mono text-[#089981] inline-block tabular-nums">
                +1,420 Pips
              </div>
              <span className="text-[11px] text-[#787b86] mt-1 block">
                {isAr ? 'منذ إطلاق 2026' : 'Since Jan 2026 launch'}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-center">
              <span className="text-xs font-mono text-[#787b86] block mb-1">
                {isAr ? 'نسبة نجاح الصفقات' : 'Verified Win Rate'}
              </span>
              <div dir="ltr" className="text-3xl sm:text-4xl font-black font-mono text-[#089981] inline-block tabular-nums">
                84.5%
              </div>
              <span className="text-[11px] text-[#787b86] mt-1 block">
                {isAr ? 'معدل موثق تاريخياً' : 'Audited win rate'}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-center">
              <span className="text-xs font-mono text-[#787b86] block mb-1">
                {isAr ? 'المتداولون النشطون يومياً' : 'Daily Active Traders'}
              </span>
              <div dir="ltr" className="text-3xl sm:text-4xl font-black font-mono text-white inline-block tabular-nums">
                +300
              </div>
              <span className="text-[11px] text-[#787b86] mt-1 block">
                {isAr ? 'متداول نشط في المجتمع' : 'Active traders online'}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-center">
              <span className="text-xs font-mono text-[#787b86] block mb-1">
                {isAr ? 'متوسط العائد إلى المخاطرة' : 'Average R:R Ratio'}
              </span>
              <div dir="ltr" className="text-3xl sm:text-4xl font-black font-mono text-[#089981] inline-block tabular-nums">
                1 : 2.4
              </div>
              <span className="text-[11px] text-[#787b86] mt-1 block">
                {isAr ? 'انضباط رياضي صارم' : 'Strict mathematical edge'}
              </span>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl overflow-hidden mb-12 shadow-lg">
            <div className="p-4 border-b border-[#2a2e39] flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white">
                {isAr ? 'سجل العمليات الأخير (Audit Log)' : 'Recent Signal Audit Log'}
              </span>
              <span className="text-[11px] font-mono text-[#089981]">
                Verified by London LD4 Institutional Feed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs font-mono">
                <thead className="bg-[#131722] text-[#787b86] border-b border-[#2a2e39]">
                  <tr>
                    <th className="p-3 text-start">ID</th>
                    <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3 text-start">{isAr ? 'الأصل' : 'Asset'}</th>
                    <th className="p-3 text-start">{isAr ? 'النوع' : 'Type'}</th>
                    <th className="p-3 text-start">{isAr ? 'الدخول' : 'Entry'}</th>
                    <th className="p-3 text-start">{isAr ? 'الخروج' : 'Exit'}</th>
                    <th className="p-3 text-start">{isAr ? 'النقاط' : 'Pips'}</th>
                    <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2e39]">
                  <tr className="hover:bg-[#2a2e39]/30 transition-colors">
                    <td className="p-3 text-[#787b86]">TR-9821</td>
                    <td className="p-3 text-white">{isAr ? 'اليوم • 16:45' : 'Today 16:45'}</td>
                    <td className="p-3 font-bold text-white">US100</td>
                    <td className="p-3 text-[#089981] font-bold">BUY</td>
                    <td dir="ltr" className="p-3">20,440.00</td>
                    <td dir="ltr" className="p-3">20,560.00</td>
                    <td dir="ltr" className="p-3 text-[#089981] font-bold inline-block">+120 Pips</td>
                    <td className="p-3 text-[#089981]">VERIFIED ✓</td>
                  </tr>
                  <tr className="hover:bg-[#2a2e39]/30 transition-colors">
                    <td className="p-3 text-[#787b86]">TR-9818</td>
                    <td className="p-3 text-white">{isAr ? 'اليوم • 14:10' : 'Today 14:10'}</td>
                    <td className="p-3 font-bold text-white">XAUUSD</td>
                    <td className="p-3 text-[#089981] font-bold">BUY</td>
                    <td dir="ltr" className="p-3">2,668.50</td>
                    <td dir="ltr" className="p-3">2,684.90</td>
                    <td dir="ltr" className="p-3 text-[#089981] font-bold inline-block">+164 Pips</td>
                    <td className="p-3 text-[#089981]">VERIFIED ✓</td>
                  </tr>
                  <tr className="hover:bg-[#2a2e39]/30 transition-colors">
                    <td className="p-3 text-[#787b86]">TR-9814</td>
                    <td className="p-3 text-white">{isAr ? 'أمس • 17:30' : 'Yesterday 17:30'}</td>
                    <td className="p-3 font-bold text-white">EURUSD</td>
                    <td className="p-3 text-[#f23645] font-bold">SELL</td>
                    <td dir="ltr" className="p-3">1.0875</td>
                    <td dir="ltr" className="p-3">1.0842</td>
                    <td dir="ltr" className="p-3 text-[#089981] font-bold inline-block">+33 Pips</td>
                    <td className="p-3 text-[#089981]">VERIFIED ✓</td>
                  </tr>
                  <tr className="hover:bg-[#2a2e39]/30 transition-colors">
                    <td className="p-3 text-[#787b86]">TR-9809</td>
                    <td className="p-3 text-white">{isAr ? 'أمس • 11:15' : 'Yesterday 11:15'}</td>
                    <td className="p-3 font-bold text-white">US100</td>
                    <td className="p-3 text-[#089981] font-bold">BUY</td>
                    <td dir="ltr" className="p-3">20,380.00</td>
                    <td dir="ltr" className="p-3">20,495.00</td>
                    <td dir="ltr" className="p-3 text-[#089981] font-bold inline-block">+115 Pips</td>
                    <td className="p-3 text-[#089981]">VERIFIED ✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
            <div className="p-4 rounded-xl bg-[#1e222d] border border-[#2a2e39]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-white text-xs">{isAr ? 'يناير 2026' : 'January 2026'}</span>
                <span dir="ltr" className="text-[#089981] font-mono font-bold text-xs inline-block">+410 Pips</span>
              </div>
              <p className="text-xs text-[#787b86]">
                {isAr ? 'نسبة نجاح 86% • 42 صفقة موثقة' : '86% win rate • 42 verified trades'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1e222d] border border-[#2a2e39]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-white text-xs">{isAr ? 'فبراير 2026' : 'February 2026'}</span>
                <span dir="ltr" className="text-[#089981] font-mono font-bold text-xs inline-block">+390 Pips</span>
              </div>
              <p className="text-xs text-[#787b86]">
                {isAr ? 'نسبة نجاح 82% • 38 صفقة موثقة' : '82% win rate • 38 verified trades'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1e222d] border border-[#2a2e39]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-white text-xs">{isAr ? 'مارس 2026' : 'March 2026'}</span>
                <span dir="ltr" className="text-[#089981] font-mono font-bold text-xs inline-block">+620 Pips</span>
              </div>
              <p className="text-xs text-[#787b86]">
                {isAr ? 'نسبة نجاح 85.5% • 51 صفقة موثقة' : '85.5% win rate • 51 verified trades'}
              </p>
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-[#1e222d] border border-[#2a2e39] space-y-3">
              <div className="text-white font-mono">★★★★★</div>
              <p className="text-xs text-[#787b86] leading-relaxed">
                {isAr
                  ? '"MBK Desk غيّر طريقتي في التعامل مع شارت ناسداك بالكامل. الإشارات الآلية مع وقف الخسارة الصارم هي السبب في نجاحي في تحدي التمويل."'
                  : '"MBK Desk completely overhauled my execution on US100. Precision entries combined with strict stop losses helped me pass my funded challenge."'}
              </p>
              <div className="text-xs font-bold text-white">
                {isAr ? 'فهد القحطاني — متداول مموّل ($100K)' : 'Fahad Al-Qahtani — Funded Trader ($100K)'}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#1e222d] border border-[#2a2e39] space-y-3">
              <div className="text-white font-mono">★★★★★</div>
              <p className="text-xs text-[#787b86] leading-relaxed">
                {isAr
                  ? '"أفضل ما في المنصة هو الشفافية. سجل النتائج منشور بدون أي خداع، وإشارات الذهب اليومية تحقق أهدافها بانتظام."'
                  : '"What sets MBK apart is pure transparency. The track record is auditable, and Gold trade ideas consistently hit targets."'}
              </p>
              <div className="text-xs font-bold text-white">
                {isAr ? 'عمر المصري — متداول Pro' : 'Omar El-Masry — Pro Trader'}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#1e222d] border border-[#2a2e39] space-y-3">
              <div className="text-white font-mono">★★★★★</div>
              <p className="text-xs text-[#787b86] leading-relaxed">
                {isAr
                  ? '"المستشار الذكي وتحليل الصور مذهل! أرفع الشارت ويكتب لي سيناريو السيولة والكسر الكاذب خلال ثوانٍ معدودة."'
                  : '"AI Chart Vision is revolutionary. I upload my chart and receive an institutional liquidity roadmap within seconds."'}
              </p>
              <div className="text-xs font-bold text-white">
                {isAr ? 'مايكل ر. — متداول خوارزمي' : 'Michael R. — Quantitative Trader'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: `الأسعار (#pricing)` — 3 TIERS & 25-ROW MATRIX */}
      <section id="pricing" className="py-16 md:py-20 border-b border-[#2a2e39] bg-[#131722]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="font-mono text-xs font-bold text-[#089981] uppercase tracking-wider block mb-2">
              {isAr ? 'باقات الاشتراك' : 'FLEXIBLE PLANS'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
              {isAr ? 'اختر ميزتك في التداول' : 'Choose Your Trading Edge'}
            </h2>
            <p className="text-sm text-[#787b86]">
              {isAr
                ? 'ابدأ مجاناً اليوم، أو رقّ حسابك إلى Pro أو Elite للوصول لكامل التوصيات ومختبر الباك تيست.'
                : 'Start free today, or upgrade to Pro or Elite for full signals and Backtest Lab.'}
            </p>

            {/* Billing Toggle */}
            <div className="mt-6 inline-flex items-center gap-2 bg-[#1e222d] p-1 rounded-lg border border-[#2a2e39] text-xs font-semibold">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-1.5 rounded transition-all cursor-pointer ${
                  billingPeriod === 'monthly' ? 'bg-[#2a2e39] text-white' : 'text-[#787b86] hover:text-white'
                }`}
              >
                {isAr ? 'شهري' : 'Monthly'}
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-4 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingPeriod === 'annual' ? 'bg-white text-[#131722]' : 'text-[#787b86] hover:text-white'
                }`}
              >
                <span>{isAr ? 'سنوي وفّر 44%' : 'Annual Save 44%'}</span>
              </button>
            </div>
          </div>

          {/* 3 Monochrome Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Free Tier */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-white">
                    {isAr ? 'مجاني' : 'Free'}
                  </h3>
                  <span className="text-xs font-mono text-[#787b86]">Tier 01</span>
                </div>
                <div className="text-3xl font-black text-white font-mono mb-2">
                  $0
                  <span className="text-xs font-normal text-[#787b86]"> / {isAr ? 'دائماً' : 'forever'}</span>
                </div>
                <p className="text-xs text-[#787b86] mb-6">
                  {isAr ? 'ابنِ روتينك في التداول.' : 'Build your trading routine.'}
                </p>

                <div className="space-y-2.5 text-xs text-[#d1d4dc] mb-8">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'يوميات التداول والتداول التجريبي ($10K)' : 'Trading journal & paper trading ($10K)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'أكاديمية التداول الكاملة (11 مستوى)' : 'Full Trading Academy (11 levels)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'فحص الحالة النفسية والأهداف' : 'Goals & emotion check-ins'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'شارت مباشر وتقويم وحاسبات' : 'Live charts, calendar & calculators'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleAuthClick('signup')}
                className="w-full py-3 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-white border border-[#363a45] hover:border-white font-bold text-xs transition-colors cursor-pointer"
              >
                {isAr ? 'ابدأ مجاناً' : 'Start Free'}
              </button>
            </div>

            {/* Pro Tier */}
            <div className="bg-[#1e222d] border border-white rounded-2xl p-6 flex flex-col justify-between relative shadow-xl">
              <div className="absolute -top-3 start-1/2 -translate-x-1/2 bg-white text-[#131722] text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider font-mono">
                {isAr ? 'الأكثر طلباً' : 'MOST POPULAR'}
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-white">Pro</h3>
                  <span className="text-xs font-mono text-[#089981]">Tier 02</span>
                </div>
                <div className="text-3xl font-black text-white font-mono mb-2">
                  {billingPeriod === 'annual' ? '$16.67' : '$29.99'}
                  <span className="text-xs font-normal text-[#787b86]"> / {isAr ? 'شهرياً' : 'month'}</span>
                </div>
                <p className="text-xs text-[#787b86] mb-6">
                  {isAr ? 'حوّل صفقاتك إلى دروس.' : 'Turn your trades into lessons.'}
                </p>

                <div className="space-y-2.5 text-xs text-[#d1d4dc] mb-8">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'كل ما في الباقة المجانية بالإضافة إلى:' : 'Everything in Free, plus:'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'حتى 3 أفكار تداول ذكية أسبوعياً' : 'Up to 3 trade ideas/week'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'المستشار الذكي (20 رسالة/يوم)' : 'AI Advisor (20 msg/day)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'نقاش الأعضاء وقناة تيليجرام MBK خاصة' : 'Member Discussion & private Telegram'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleAuthClick('signup', 'PRO2026')}
                  className="w-full py-3 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'ابدأ Pro' : 'Start Pro'}
                </button>
                <button
                  onClick={handlePromoClick}
                  className="w-full py-2 rounded-lg bg-[#2a2e39] text-[#787b86] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  {isAr ? 'تفعيل برمز VIP' : 'Activate with VIP Code'}
                </button>
              </div>
            </div>

            {/* Elite / VIP Tier */}
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-white">Elite / VIP</h3>
                  <span className="text-xs font-mono text-[#089981]">Tier 03</span>
                </div>
                <div className="text-3xl font-black text-white font-mono mb-2">
                  {billingPeriod === 'annual' ? '$41.67' : '$69.99'}
                  <span className="text-xs font-normal text-[#787b86]"> / {isAr ? 'شهرياً' : 'month'}</span>
                </div>
                <p className="text-xs text-[#787b86] mb-6">
                  {isAr
                    ? 'تعمّق أكثر مع الحسابات المتصلة والتوجيه الذكي.'
                    : 'Go deeper with connected accounts and AI coaching.'}
                </p>

                <div className="space-y-2.5 text-xs text-[#d1d4dc] mb-8">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'كل ما في باقة Pro بالإضافة إلى:' : 'Everything in Pro, plus:'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'إشارات غير محدودة من مؤشرات Pine Script' : 'Unlimited Pine Script Webhook signals'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'المستشار الذكي المتقدم (100 رسالة/يوم)' : 'Advanced AI Advisor (100 msg/day)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#089981] shrink-0" />
                    <span>{isAr ? 'ربط حسابات MT4/MT5 ومختبر الباك تيست' : 'MT4/MT5 linking & Backtest Lab'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleAuthClick('signup', 'ELITE2026')}
                  className="w-full py-3 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'انضم إلى Elite' : 'Join Elite'}
                </button>
                <button
                  onClick={handleBrokerClick}
                  className="w-full py-2 rounded-lg bg-[#2a2e39] text-[#089981] hover:text-white border border-[#363a45] text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  {isAr ? 'تفعيل مجاني عبر الوسيط المعتمد' : 'Unlock free via Partner Broker'}
                </button>
              </div>
            </div>
          </div>

          {/* Full Comparison Table (25 Rows) */}
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3.5 sm:p-5 border-b border-[#2a2e39] flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isAr ? 'قارن بين المجاني وPro وElite' : 'Compare Free, Pro & Elite'}
              </h3>
              <div className="flex items-center gap-2">
                <span className="md:hidden text-[10px] text-[#787b86]">
                  {isAr ? '← اسحب أفقياً →' : '← Swipe →'}
                </span>
                <span className="text-xs font-mono text-[#787b86] hidden sm:inline">25 Capabilities Matrix</span>
              </div>
            </div>

            <div className="overflow-x-auto smooth-scroll-x">
              <table className="w-full text-start text-xs font-mono min-w-[540px]">
                <thead className="bg-[#131722] text-[#787b86] border-b border-[#2a2e39]">
                  <tr>
                    <th className="p-3 text-start w-1/2">{isAr ? 'الميزة / الأداة' : 'Feature / Capability'}</th>
                    <th className="p-3 text-center">{isAr ? 'مجاني' : 'Free'}</th>
                    <th className="p-3 text-center">Pro</th>
                    <th className="p-3 text-center">Elite / VIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2e39]">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#2a2e39]/30 transition-colors">
                      <td className="p-3 text-white font-sans font-medium">{row.name}</td>
                      <td className="p-3 text-center">
                        {row.free === '✓' ? (
                          <span className="text-[#089981] font-bold">✓</span>
                        ) : row.free === '—' ? (
                          <span className="text-[#50535e]">—</span>
                        ) : (
                          <span className="text-[#d1d4dc]">{row.free}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {row.pro === '✓' ? (
                          <span className="text-[#089981] font-bold">✓</span>
                        ) : row.pro === '—' ? (
                          <span className="text-[#50535e]">—</span>
                        ) : (
                          <span className="text-[#d1d4dc]">{row.pro}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {row.elite === '✓' ? (
                          <span className="text-[#089981] font-bold">✓</span>
                        ) : row.elite === '—' ? (
                          <span className="text-[#50535e]">—</span>
                        ) : (
                          <span className="text-[#089981] font-bold">{row.elite}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: `الأسئلة الشائعة ومكتبة المعرفة (#faq)` */}
      <section id="faq" className="py-16 md:py-20 border-b border-[#2a2e39] bg-[#131722]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* FAQ Accordion */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="font-mono text-xs font-bold text-[#089981] uppercase tracking-wider block mb-2">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="bg-[#1e222d] border border-[#2a2e39] rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-start flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span className="font-bold text-white text-xs sm:text-sm">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#787b86] transition-transform ${
                          isOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-[#787b86] leading-relaxed border-t border-[#2a2e39] pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* MBK Insights: 3 Educational Cards with working modal reader */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="font-mono text-xs font-bold text-[#089981] uppercase tracking-wider block mb-2">
                MBK INSIGHTS
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {isAr ? 'مكتبة المعرفة للتداول' : 'The Trading Knowledge Library'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ARTICLES.map((card) => (
                <div
                  key={card.id}
                  className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 flex flex-col justify-between hover:border-[#363a45] transition-all cursor-pointer group"
                  onClick={() => handleOpenArticle(card)}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-[#089981] bg-[#089981]/10 px-2 py-0.5 rounded border border-[#089981]/30">
                        {card.tag}
                      </span>
                      <span className="text-[#787b86]">{card.readTime}</span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:underline">
                      {isAr ? card.titleAr : card.titleEn}
                    </h3>
                    <p className="text-xs text-[#787b86] leading-relaxed">
                      {isAr ? card.subtitleAr : card.subtitleEn}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#2a2e39] flex items-center justify-between text-xs text-white font-semibold">
                    <span>{isAr ? 'اقرأ الدليل الكامل' : 'Read full guide'}</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Telegram Banner */}
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-start">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#089981] animate-ping" />
                <span className="text-xs font-mono font-bold text-[#089981]">
                  OFFICIAL TELEGRAM BROADCAST
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">
                {isAr ? 'انضم إلى أكثر من 1,000 متداول على تيليجرام' : 'Join 1,000+ Traders on Telegram'}
              </h3>
              <p className="text-xs text-[#787b86] max-w-xl">
                {isAr
                  ? 'بث فوري لأفكار التداول، والتحليلات الصباحية، وتنبيهات السيولة قبل افتتاح جلسة لندن ونيويورك.'
                  : 'Real-time trade ideas, morning macro briefs, and liquidity alerts ahead of London and New York opens.'}
              </p>
            </div>

            <a
              href="https://t.me/mbktrading"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors shrink-0 flex items-center gap-2 cursor-pointer shadow"
            >
              <Send className="w-4 h-4" />
              <span>{isAr ? 'فتح قناة تيليجرام ↗' : 'Launch Telegram ↗'}</span>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#131722] border-t border-[#2a2e39] py-12 text-xs text-[#787b86]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2a2e39] pb-8">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-white text-[#131722] flex items-center justify-center font-mono font-black text-xs">
                MBK
              </div>
              <span className="font-bold text-white font-mono text-sm">
                MBK TRADING / MBK DESK
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <a href="#desk-preview" className="hover:text-white transition-colors">{isAr ? 'غرفة الأسواق' : 'Desk'}</a>
              <a href="#workflow" className="hover:text-white transition-colors">{isAr ? 'المنصة' : 'Workflow'}</a>
              <a href="#features" className="hover:text-white transition-colors">{isAr ? 'المميزات' : 'Features'}</a>
              <a href="#track-record" className="hover:text-white transition-colors">{isAr ? 'سجل النتائج' : 'Track Record'}</a>
              <a href="#pricing" className="hover:text-white transition-colors">{isAr ? 'الأسعار' : 'Pricing'}</a>
              <a href="#faq" className="hover:text-white transition-colors">{isAr ? 'الأسئلة الشائعة' : 'FAQ'}</a>
            </div>
          </div>

          {/* Legal Risk Disclosure */}
          <div className="space-y-3 leading-relaxed text-[11px] text-[#787b86]">
            <p className="font-bold text-[#d1d4dc]">
              {isAr ? 'إخلاء المسؤولية القانونية وتحذير المخاطر المالية:' : 'Risk Warning & Legal Disclaimer:'}
            </p>
            <p>
              {isAr
                ? 'ينطوي تداول العملات الأجنبية (الفوركس) وعقود الفروقات (CFDs) والمؤشرات والسلع على درجة عالية من المخاطرة المالية وقد لا يكون مناسباً لجميع المستثمرين. قد تؤدي الرافعة المالية العالية إلى خسارة رأس مالك جزئياً أو كلياً. جميع التحليلات، وأفكار التداول، وإشارات باين سكريبت، ومخرجات المستشار الذكي المقدمة عبر منصة MBKtrading وMBK Desk هي لأغراض تعليمية وإرشادية ومعلوماتية فقط، ولا تشكل تحت أي ظرف نصيحة استثمارية أو توصية مباشرة بشراء أو بيع أي ورقة مالية. الأداء السابق لا يعتبر ضماناً موثوقاً للنتائج المستقبلية.'
                : 'Trading foreign exchange (Forex), contracts for difference (CFDs), indices, and commodities carries a high level of risk and may not be suitable for all investors. High leverage can work against you as well as for you. All analyses, trade ideas, Pine Script indicators, and AI outputs provided on MBKtrading and MBK Desk are strictly for educational and informational purposes and do not constitute financial advice. Past performance is no guarantee of future results.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#2a2e39] pt-6 text-[11px]">
            <span>© 2026 MBKtrading / MBK Desk. All Rights Reserved.</span>
            <div className="flex items-center gap-3">
              <span className="text-[#089981]">● TradingView Pure Dark Engine</span>
              <span>100% Operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Article Reader Modal */}
      <ArticleReaderModal
        isOpen={articleModalOpen}
        onClose={() => setArticleModalOpen(false)}
        article={activeArticle}
        lang={lang}
        onOpenDashboard={handleDemoClick}
      />
    </div>
  );
};
