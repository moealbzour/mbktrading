import {
  MarketTicker,
  TradeSignal,
  BotState,
  BotLogEntry,
  CopyTradingMaster,
  MBKIndicator,
  AISessionReport,
  TechnicalBreakdown,
  ChatMessage,
  EconomicNewsItem
} from '../types/trading';

export const INITIAL_TICKERS: MarketTicker[] = [
  {
    symbol: 'US100',
    nameAr: 'ناسداك 100 (عقود مؤشرات)',
    price: 20872.65,
    changePercent: +1.24,
    changeValue: +255.40,
    high: 20940.00,
    low: 20610.50,
    spread: 0.8,
    digits: 2,
    isUp: true,
    category: 'INDICES'
  },
  {
    symbol: 'XAUUSD',
    nameAr: 'الذهب مقابل الدولار (أونصة)',
    price: 2684.40,
    changePercent: +0.68,
    changeValue: +18.20,
    high: 2692.10,
    low: 2664.00,
    spread: 0.15,
    digits: 2,
    isUp: true,
    category: 'COMMODITIES'
  },
  {
    symbol: 'EURUSD',
    nameAr: 'اليورو مقابل الدولار',
    price: 1.08425,
    changePercent: -0.21,
    changeValue: -0.0023,
    high: 1.0872,
    low: 1.0831,
    spread: 0.1,
    digits: 5,
    isUp: false,
    category: 'FOREX'
  },
  {
    symbol: 'BTCUSD',
    nameAr: 'البيتكوين مقابل الدولار',
    price: 67450.00,
    changePercent: +3.85,
    changeValue: +2500.00,
    high: 68120.00,
    low: 64800.00,
    spread: 5.0,
    digits: 2,
    isUp: true,
    category: 'CRYPTO'
  },
  {
    symbol: 'WTI',
    nameAr: 'نفط خام تكساس الخفيف',
    price: 71.45,
    changePercent: -0.85,
    changeValue: -0.61,
    high: 72.40,
    low: 70.80,
    spread: 0.02,
    digits: 2,
    isUp: false,
    category: 'COMMODITIES'
  },
  {
    symbol: 'GBPUSD',
    nameAr: 'الجنيه الإسترليني مقابل الدولار',
    price: 1.3018,
    changePercent: +0.15,
    changeValue: +0.0019,
    high: 1.3045,
    low: 1.2990,
    spread: 0.2,
    digits: 5,
    isUp: true,
    category: 'FOREX'
  }
];

export const INITIAL_SIGNALS: TradeSignal[] = [
  {
    id: 'SIG-8842',
    symbol: 'US100',
    type: 'BUY',
    entryPrice: 20820.00,
    tp1: 20880.00,
    tp2: 20950.00,
    sl: 20760.00,
    currentPrice: 20872.65,
    pips: 52.65,
    status: 'ACTIVE',
    riskReward: '1:2.2',
    timeframe: 'M5 / M15',
    confidence: 94,
    strategyName: 'MBK Scalp Breakout & Volume Profile',
    createdAt: 'منذ 18 دقيقة',
    verifiedWebhook: true,
    notesAr: 'كسر مستوى المقاومة اللحظية 20815 مع تدفق سيولة شرائية من جلسة نيويورك. الهدف الأول اقترب.'
  },
  {
    id: 'SIG-8841',
    symbol: 'XAUUSD',
    type: 'BUY',
    entryPrice: 2668.00,
    tp1: 2678.00,
    tp2: 2688.00,
    sl: 2658.00,
    currentPrice: 2684.40,
    pips: 164.0,
    status: 'TP1_HIT',
    riskReward: '1:2.0',
    timeframe: 'M15',
    confidence: 91,
    strategyName: 'MBK Alligator & Fair Value Gap',
    createdAt: 'منذ ساعتين',
    verifiedWebhook: true,
    notesAr: 'ارتداد مثالي من منطقة كتلة الأوامر المؤسسية (Order Block) عند 2668. تم تحقيق الهدف الأول (+100 نقطة) وتأمين الصفقة بنقطة الدخول.'
  },
  {
    id: 'SIG-8840',
    symbol: 'US100',
    type: 'SELL',
    entryPrice: 20740.00,
    tp1: 20680.00,
    tp2: 20610.00,
    sl: 20790.00,
    currentPrice: 20610.00,
    pips: 130.0,
    status: 'TP2_HIT',
    riskReward: '1:2.6',
    timeframe: 'M5',
    confidence: 89,
    strategyName: 'London Session High Sweep',
    createdAt: 'اليوم، 11:30 ص',
    verifiedWebhook: true,
    notesAr: 'ضرب الهدفين بالكامل! صفقة سريعة حصدت أكثر من 130 نقطة خلال جلسة لندن للمشتركين.'
  },
  {
    id: 'SIG-8839',
    symbol: 'XAUUSD',
    type: 'SELL',
    entryPrice: 2674.50,
    tp1: 2665.00,
    tp2: 2655.00,
    sl: 2682.00,
    currentPrice: 2665.00,
    pips: 95.0,
    status: 'TP1_HIT',
    riskReward: '1:2.5',
    timeframe: 'M30',
    confidence: 86,
    strategyName: 'Fractal Trend Invalidation',
    createdAt: 'أمس، 04:15 م',
    verifiedWebhook: true,
    notesAr: 'تحقق الهدف الأول بنجاح قبل خطاب الفيدرالي الأمريكي.'
  },
  {
    id: 'SIG-8838',
    symbol: 'EURUSD',
    type: 'SELL',
    entryPrice: 1.0875,
    tp1: 1.0845,
    tp2: 1.0815,
    sl: 1.0895,
    currentPrice: 1.0842,
    pips: 33.0,
    status: 'ACTIVE',
    riskReward: '1:3.0',
    timeframe: 'H1',
    confidence: 88,
    strategyName: 'USD Strength Rebound',
    createdAt: 'منذ 4 ساعات',
    verifiedWebhook: true,
    notesAr: 'الكسر الفني للمتوسط المتحرك 50 على فريم الساعة. الهدف الأول قيد الاختبار.'
  }
];

export const INITIAL_BOT_STATE: BotState = {
  isRunning: true,
  selectedStrategy: 'SCALPING_NASDAQ',
  riskPercentage: 1.5,
  tradeLimit: 10,
  tp1Ratio: 1.5,
  tp2Ratio: 3.0,
  stopLossPoints: 45,
  trailingStopActive: true,
  todayPnL: 5320.00,
  winRate: 83.3,
  totalTradesToday: 8,
  successfulTrades: 6,
  connectionStatus: 'CONNECTED',
  mt5Server: 'MBK-Prime-Bridge-NY4.vps.live',
  accountBalance: 48650.00,
  equity: 53970.00
};

export const INITIAL_BOT_LOGS: BotLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '21:42:15',
    level: 'INFO',
    message: 'فحص اتصال خادم VPS والربط المباشر مع MetaTrader 5 Bridge... الاتصال مستقر بنسبة 99.98% (الاستجابة: 2ms)'
  },
  {
    id: 'log-2',
    timestamp: '21:30:04',
    level: 'TRADE',
    message: 'تنفيذ صفقة شراء تلقائية [US100] عند 20820.00 | حجم اللوت: 2.50 | وقف الخسارة: 20760.00 | الهدف: 20880.00'
  },
  {
    id: 'log-3',
    timestamp: '21:15:42',
    level: 'ALERT',
    message: 'اكتشاف تدفق سيولة زائد على مؤشر ناسداك - تفعيل نظام Trailing Stop الديناميكي لحماية الأرباح'
  },
  {
    id: 'log-4',
    timestamp: '20:45:10',
    level: 'SUCCESS',
    message: 'إغلاق 50% من عقد XAUUSD عند الهدف الأول 2678.00 | ربح محقق: +$1,250.00 | نقل الوقف إلى نقطة الدخول Breakeven'
  },
  {
    id: 'log-5',
    timestamp: '19:12:33',
    level: 'SUCCESS',
    message: 'إغلاق صفقة بيع ناسداك بالكامل عند الهدف الثاني | ربح إجمالي: +$3,420.00'
  }
];

export const MASTER_TRADER_PROFILE: CopyTradingMaster = {
  name: 'فريق أبحاث MBK المؤسسي',
  title: 'نظام التداول المؤسسي المعتمد لـ MBKtrading',
  allTimeGain: '+342.8%',
  monthlyGain: '+28.4%',
  winRate: 84.5,
  totalCopiers: 412,
  currentDrawdown: '5.2%',
  profitSharePercent: 20,
  minCapital: 500,
  recommendedCapital: 2500,
  isSynced: true,
  copierMultiplier: 1.0,
  managedEquity: '$1,485,200 USD'
};

export const MBK_INDICATORS: MBKIndicator[] = [
  {
    id: 'ind-precision-engine',
    name: 'MBK Multi-Timeframe Precision Engine',
    nameAr: 'محرك الدقة متعدد الأطر الزمنية MBK v4.2',
    version: '4.2.0',
    badge: 'الأكثر مبيعاً 🏆',
    rating: 4.96,
    reviewCount: 384,
    priceUsd: 149,
    partnerBrokerFree: true,
    summaryAr: 'المؤشر الخوارزمي الأقوى المطور خصيصاً للتداول على مؤشر ناسداك والذهب. يقوم بدمج بيانات 4 أطر زمنية متزامنة لإعطاء إشارات شراء وبيع خالية من التشويش.',
    featuresAr: [
      'فلاتر سيولة مؤسسية تحذف الإشارات الكاذبة بنسبة 85%',
      'تحديد آلي لمناطق الدخول ووقف الخسارة وجني الأرباح TP1 و TP2 و TP3',
      'تنبيهات فورية تدعم ربط Webhook مباشر مع تيليجرام وميتاتريدر',
      'تحديث دائم وكود Pine Script v5 حصري للمشتركين'
    ],
    pineScriptSnippet: `//@version=5\nindicator("MBK Multi-Timeframe Precision Engine [VIP]", overlay=true)\n// Proprietary Algorithm by MBK Quant Research\ninput_tf = input.timeframe("15", "Anchor Timeframe")\nsens = input.float(1.618, "MBK Algorithmic Multiplier")`,
    compatiblePlatforms: ['TradingView Pro/Free', 'Pine Script v5', 'MT4/MT5 Webhook Bridge']
  },
  {
    id: 'ind-alligator-fractal',
    name: 'MBK Alligator & Fractal Suite Pro',
    nameAr: 'حزمة التمساح والكسيريات المتقدمة MBK',
    version: '3.1.0',
    badge: 'مفضل للمضاربة ⚡',
    rating: 4.88,
    reviewCount: 247,
    priceUsd: 119,
    partnerBrokerFree: true,
    summaryAr: 'تطوير حديث ومؤسسي لنظرية بيل ويليامز للتمساح والكسيريات متوافق مع حركة الأسواق الحديثة والمضاربة اللحظية (Scalping) على فريمات الدقيقة والخمس دقائق.',
    featuresAr: [
      'رصد خطوط الفك والأسنان والشفاه بحسابات توازن ديناميكية محسنة',
      'كشف مناطق النوم والافتراس للتمساح لتجنب التداول في التذبذب القاتل',
      'إشارات كسر الكسيريات المدعومة بتأكيد حجم الفوليوم',
      'واجهة تحكم مرئية ملونة ومبسطة للمتداولين'
    ],
    pineScriptSnippet: `//@version=5\nindicator("MBK Alligator & Fractal Suite Pro", overlay=true)\njaws = ta.smma(hl2, 13)\nteeth = ta.smma(hl2, 8)\nlips = ta.smma(hl2, 5)`,
    compatiblePlatforms: ['TradingView Pro/Free', 'Pine Script v5']
  },
  {
    id: 'ind-smc-orderblocks',
    name: 'MBK Institutional Order Blocks & Liquidity',
    nameAr: 'مستكشف كتل الأوامر والسيولة المؤسسية SMC',
    version: '2.5.0',
    badge: 'إصدار مؤسسي 💎',
    rating: 4.92,
    reviewCount: 198,
    priceUsd: 189,
    partnerBrokerFree: true,
    summaryAr: 'رسم تلقائي لمناطق تدفق سيولة البنوك والمؤسسات المالية (Order Blocks, Fair Value Gaps, Liquidity Sweeps) مع خطوط دعم ومقاومة غير مرئية للمتداول العادي.',
    featuresAr: [
      'رسم فوري لكتل الأوامر الصاعدة والهابطة مع درجة قوتها',
      'تحديد الفجوات السعرية العادلة (FVG) ومعدل ملئها التلقائي',
      'تحديد قيعان وقمم السيولة المغرية (Liquidity Pools)',
      'نسبة نجاح استثنائية عند الدمج مع إشارات ناسداك'
    ],
    pineScriptSnippet: `//@version=5\nindicator("MBK Institutional Order Blocks & Liquidity", overlay=true)\n// Smart Money Matrix by MBKtrading`,
    compatiblePlatforms: ['TradingView Pro/Free', 'Pine Script v5']
  }
];

export const BATCH_AI_SESSIONS: Record<'asia' | 'london' | 'ny', AISessionReport> = {
  ny: {
    sessionId: 'ny',
    sessionNameAr: 'افتتاح جلسة نيويورك (الأمريكية)',
    sessionTimeUtc: '13:30 - 21:00 UTC (أعلى سيولة في اليوم)',
    lastUpdated: 'تم التحديث الدفعي: منذ 45 دقيقة (مجدول آلياً 00:00 / 08:00 / 14:00)',
    us100: {
      bias: 'BULLISH',
      confidence: 88,
      pivot: 20780.00,
      resistance: [20950.00, 21080.00, 21200.00],
      support: [20760.00, 20680.00, 20550.00],
      catalystsAr: [
        'تدفق أرباح شركات قطاع التكنولوجيا وأشباه الموصلات الإيجابية',
        'تراجع طفيف في عوائد سندات الخزانة الأمريكية لأجل 10 سنوات إلى 4.18%',
        'ثبات المؤشر أعلى خط المتوسط المتحرك الأسي 200 على فريم الساعة'
      ],
      actionPlanAr: 'البحث عن مراكز شراء (Long) عند اختبار مناطق الدعم 20,780 - 20,810 مع استهداف المقاومة 20,950 كهدف أول. إلغاء النظرة الصعودية في حال كسر 20,680 هبوطاً بإغلاق شمعة ساعة.'
    },
    gold: {
      bias: 'NEUTRAL',
      confidence: 76,
      pivot: 2680.00,
      resistance: [2692.00, 2705.00, 2720.00],
      support: [2670.00, 2658.00, 2642.00],
      catalystsAr: [
        'ترقب بيانات تضخم مؤشر أسعار المستهلكين CPI غداً الأربعاء',
        'توازن الطلب كملاذ آمن مع قوة مؤشر الدولار DXY عند 103.80',
        'حركة عرضية بين 2,668 و 2,690 على فريم الأربع ساعات'
      ],
      actionPlanAr: 'التداول بنمط المضاربة السريعة (Scalping) بين حدي النطاق 2670 (شراء) و 2692 (بيع). تجنب العقود الكبيرة قبل كسر واضح ومؤكد لأحد الحدين.'
    },
    macroSummaryAr: 'تتجه معنويات جلسة وول ستريت نحو المخاطرة الإيجابية (Risk-On) بقيادة قطاع التكنولوجيا الضخمة. الضغوط التضخمية مستقرة نسبياً مما يمنح المستثمرين ثقة في استمرار استقرار الفائدة الفيدرالية.'
  },
  london: {
    sessionId: 'london',
    sessionNameAr: 'افتتاح جلسة لندن (الأوروبية)',
    sessionTimeUtc: '07:00 - 15:30 UTC',
    lastUpdated: 'تمت الأرشفة بنجاح للدورة السابقة',
    us100: {
      bias: 'NEUTRAL',
      confidence: 79,
      pivot: 20680.00,
      resistance: [20790.00, 20850.00],
      support: [20620.00, 20540.00],
      catalystsAr: [
        'تداول حذر في العقود الآجلة بانتظار دخول صناديق وول ستريت',
        'بيانات مؤشر مديري المشتريات الأوروبي متباينة'
      ],
      actionPlanAr: 'اقتناص ارتدادات تصحيحية سريعة داخل نطاق 120 نقطة.'
    },
    gold: {
      bias: 'BULLISH',
      confidence: 84,
      pivot: 2665.00,
      resistance: [2680.00, 2690.00],
      support: [2660.00, 2650.00],
      catalystsAr: [
        'شراء مكثف من البنوك المركزية عبر جلسة لندن الصباحية',
        'تراجع طفيف لليورو مقابل الذهب'
      ],
      actionPlanAr: 'تأكيد إشارات الشراء عند ملامسة الدعم 2668 مع وقف خسارة 2658.'
    },
    macroSummaryAr: 'افتتاح لندن اتسم بالحفاظ على السيولة وضخ مراكز شراء مبكرة على الذهب مع مراقبة أرقام التجارة البريطانية والأوروبية.'
  },
  asia: {
    sessionId: 'asia',
    sessionNameAr: 'افتتاح جلسة آسيا / طوكيو',
    sessionTimeUtc: '00:00 - 08:00 UTC',
    lastUpdated: 'تمت الأرشفة بنجاح للدورة السابقة',
    us100: {
      bias: 'NEUTRAL',
      confidence: 72,
      pivot: 20640.00,
      resistance: [20700.00, 20750.00],
      support: [20590.00, 20520.00],
      catalystsAr: ['حركة سيولة منخفضة وتذبذب ضيق معتاد في الفترة الآسيوية'],
      actionPlanAr: 'تجنب المضاربات العنيفة وتفعيل بوت التذبذب اللحظي المحدود فقط.'
    },
    gold: {
      bias: 'BULLISH',
      confidence: 80,
      pivot: 2660.00,
      resistance: [2672.00, 2682.00],
      support: [2652.00, 2640.00],
      catalystsAr: ['تدفقات طلب مادية من أسواق شنغهاي وهونغ كونغ'],
      actionPlanAr: 'تجميع تدريجي في مناطق 2658 - 2662.'
    },
    macroSummaryAr: 'الجلسة الآسيوية حافظت على استقرار الأسعار العالمية تحضيراً لزخم السيولة الغربية.'
  }
};

export const TECHNICAL_BREAKDOWNS: TechnicalBreakdown[] = [
  {
    id: 'post-1',
    titleAr: 'التحليل الفني لناسداك US100: كسر القناة الهابطة واستعداد لاستهداف 21,200',
    symbol: 'US100',
    timeframe: 'H4 / Daily',
    author: 'فريق أبحاث MBK',
    publishedAt: 'اليوم، 14:30 بتوقيت مكة',
    coverImage: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&auto=format&fit=crop&q=80',
    direction: 'BULLISH',
    keyZonesAr: [
      { name: 'منطقة كسر السيولة (Order Block)', price: '20,740 - 20,780', role: 'دعم رئيسي صاعد' },
      { name: 'الهدف التوسعي الأول Fibo 1.618', price: '20,950.00', role: 'مقاومة تصفية أولى' },
      { name: 'الهدف المؤسسي الثاني', price: '21,200.00', role: 'قمة تاريخية جديدة' }
    ],
    summaryAr: 'يُظهر مؤشر ناسداك تشكيل نموذج استمراري إيجابي بعد إعادة اختبار الدعم المؤسسي 20,740. طالما يتداول السعر أعلى 20,680، فإن النظرة الفنية ترجح استمرار الموجة الصاعدة الخامسة باتجاه 21,200.',
    targetPrice: 21200.00,
    invalidationLevel: 20680.00
  },
  {
    id: 'post-2',
    titleAr: 'تحليل الذهب XAUUSD: سيناريو الموجة التصحيحية وفرص الدخول بعد إعادة الاختبار',
    symbol: 'XAUUSD',
    timeframe: 'H1 / H4',
    author: 'فريق أبحاث MBK',
    publishedAt: 'أمس، 18:00 بتوقيت مكة',
    coverImage: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&auto=format&fit=crop&q=80',
    direction: 'BULLISH',
    keyZonesAr: [
      { name: 'منطقة الارتداد الذهبية Fibo 61.8%', price: '2,668.00', role: 'قاع محوري تم احترامه' },
      { name: 'منطقة عرض لحظية', price: '2,692.00', role: 'مقاومة قيد الاختبار' },
      { name: 'حاجز المقاومة النفسي', price: '2,720.00', role: 'هدف تمدد رئيسي' }
    ],
    summaryAr: 'أكد الذهب قوته الصعودية بالارتداد الدقيق من 2668 دولار للأونصة. نوصي بالاحتفاظ بمراكز الشراء المحمية مع تأمين رأس المال والاستعداد للمستوى 2700.',
    targetPrice: 2720.00,
    invalidationLevel: 2650.00
  }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: {
      name: 'فريق أبحاث MBK (Certified Analysts)',
      roleAr: 'المحللون المعتمدون 👑',
      badge: 'FOUNDER',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    content: 'أهلاً بالجميع في غرفة التداول الحية لـ MBKtrading. مبروك لكل من دخل صفقة ناسداك [US100 BUY] - تم تأمين نصف العقود على الهدف الأول بربح أكثر من 50 نقطة. دعوا الأرباح تجري نحو TP2.',
    timestamp: '21:32',
    likes: 38,
    isLikedByMe: true
  },
  {
    id: 'msg-2',
    sender: {
      name: 'أحمد السعدي',
      roleAr: 'عضو VIP نشط',
      badge: 'VIP_PRO',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    content: 'الله يبارك فيكم! البوت الآلي فتح الصفقة بدقة متناهية وسكر نصف اللوت على 20880. أرباح اليوم تخطت $840 بحسابي عبر وسيط الشراكة المعتمد.',
    timestamp: '21:35',
    likes: 19
  },
  {
    id: 'msg-3',
    sender: {
      name: 'طارق الحربي',
      roleAr: 'مضارب سكالبينغ محترف',
      badge: 'SCALPER',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    },
    content: 'مؤشر MBK Precision Engine على فريم 5 دقائق كان معطينا سهم شراء أخضر مؤكد عند 20818 مع فوليوم شرائي عالي جداً. دقة خارقة صراحة!',
    timestamp: '21:38',
    likes: 14
  },
  {
    id: 'msg-4',
    sender: {
      name: 'عمر القاسم',
      roleAr: 'متداول مجتمع VIP',
      badge: 'VIP_PRO',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
    },
    content: 'شباب، هل في تحديث بخصوص صفقة الذهب؟ هل نغلقها أم نستمر للهدف الثاني 2688؟',
    timestamp: '21:40',
    likes: 5
  },
  {
    id: 'msg-5',
    sender: {
      name: 'فريق أبحاث MBK (Certified Analysts)',
      roleAr: 'المحللون المعتمدون 👑',
      badge: 'FOUNDER',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    content: '@عمر القاسم: طالما نقلك للوقف على الدخول (Breakeven) سليم، اترك الصفقة للهدف الثاني. معنويات جلسة نيويورك تدعم الارتفاع نحو 2688 و 2692.',
    timestamp: '21:41',
    likes: 27
  }
];

export const ECONOMIC_CALENDAR_ITEMS: EconomicNewsItem[] = [
  {
    id: 'eco-1',
    titleAr: 'مؤشر أسعار المستهلكين الأمريكي (CPI الأساسي السنوي)',
    country: 'الولايات المتحدة',
    currency: 'USD',
    timeAr: 'غداً 15:30',
    impact: 'HIGH',
    forecast: '3.2%',
    previous: '3.3%'
  },
  {
    id: 'eco-2',
    titleAr: 'طلبات إعانة البطالة الأسبوعية الأمريكية',
    country: 'الولايات المتحدة',
    currency: 'USD',
    timeAr: 'الخميس 15:30',
    impact: 'HIGH',
    forecast: '218K',
    previous: '225K'
  },
  {
    id: 'eco-3',
    titleAr: 'حديث رئيس الاحتياطي الفيدرالي جيروم باول',
    country: 'الولايات المتحدة',
    currency: 'USD',
    timeAr: 'الجمعة 18:00',
    impact: 'HIGH',
    forecast: '-',
    previous: '-'
  },
  {
    id: 'eco-4',
    titleAr: 'قرار الفائدة الصادر عن البنك المركزي الأوروبي',
    country: 'منطقة اليورو',
    currency: 'EUR',
    timeAr: 'الأسبوع القادم 15:15',
    impact: 'HIGH',
    forecast: '3.25%',
    previous: '3.50%'
  },
  {
    id: 'eco-5',
    titleAr: 'مؤشر مديري المشتريات التصنيعي ISM',
    country: 'الولايات المتحدة',
    currency: 'USD',
    timeAr: 'اليوم، صدر سابقاً',
    impact: 'MEDIUM',
    actual: '48.9',
    forecast: '47.6',
    previous: '47.2'
  }
];
