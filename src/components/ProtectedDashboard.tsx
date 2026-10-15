import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  MarketSymbol,
  MarketTicker,
  TradeSignal,
  ChatMessage,
  EconomicNewsItem,
  TraderProfile,
  TraderPost
} from '../types/trading';
import {
  Radio,
  Users,
  ShoppingBag,
  Share2,
  Bot,
  BookOpen,
  Settings,
  ShieldCheck,
  TrendingUp,
  Target,
  ArrowRight,
  ArrowLeft,
  Crown,
  Lock,
  Unlock,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Calendar,
  Clock,
  DollarSign,
  Activity,
  AlertTriangle,
  Send,
  Sparkles,
  Plus,
  KeyRound,
  LogOut,
  Globe,
  Volume2,
  VolumeX,
  X,
  Sliders,
  Wallet
} from 'lucide-react';
import { TradingViewChart } from './TradingViewChart';
import { HeaderTicker } from './layout/HeaderTicker';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';

interface Props {
  user: UserProfile;
  tickers: MarketTicker[];
  signals: TradeSignal[];
  chatMessages: ChatMessage[];
  economicEvents: EconomicNewsItem[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (sym: MarketSymbol) => void;
  onAddSignal: (sig: TradeSignal) => void;
  onCopySignalToAccount: (sig: TradeSignal) => void;
  onSendMessage: (text: string) => void;
  onLikeMessage: (id: string) => void;
  onLogout: () => void;
  onBackToHome?: () => void;
  onOpenBrokerModal: () => void;
  onOpenNewSignalModal: () => void;
  onOpenPromoModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onlineTraders: number;
  lang?: 'ar' | 'en';
  onToggleLang?: () => void;
}

export type DashboardTab =
  | 'signals'
  | 'traders'
  | 'indicators'
  | 'copy_trading'
  | 'ai_agent'
  | 'journal'
  | 'admin';

// Verified Traders Directory
const INITIAL_TRADERS: TraderProfile[] = [
  {
    id: 'mbk_master',
    nameAr: 'MBK Master Institutional Engine',
    nameEn: 'MBK Master Institutional Engine',
    specialtyAr: 'المؤسس والمحرك الخوارزمي الرئيسي • US100 & XAUUSD',
    specialtyEn: 'Founder & Master Algorithmic Engine • US100 & XAUUSD',
    roleAr: 'المحرك الرسمي المعتمد',
    roleEn: 'Official Algorithmic Engine',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    verifiedPipsMonth: 740,
    winRate: 88.5,
    subscribersCount: 342,
    isOfficial: true,
    specialties: ['US100', 'XAUUSD'],
    monthlyPrice: 0,
    inviteCode: 'MBK2026',
    descriptionAr: 'المحرك الخوارزمي المطور لمنصة MBKtrading لاصطياد فجوات FVG وسحب سيولة جلسات لندن ونيويورك بدقة عالية.',
    descriptionEn: 'Official quantitative trading algorithm detecting institutional FVGs and liquidity sweeps.',
    signalsCount: 148
  },
  {
    id: 'captain_tariq',
    nameAr: 'كابتن طارق (قناص الذهب)',
    nameEn: 'Captain Tariq (Gold Sniper)',
    specialtyAr: 'أخصائي تداول الذهب الفوري (XAUUSD) • SMC & Price Action',
    specialtyEn: 'Spot Gold Specialist (XAUUSD) • SMC & Price Action',
    roleAr: 'محلل شريك معتمد',
    roleEn: 'Certified Partner Analyst',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    verifiedPipsMonth: 580,
    winRate: 84.2,
    subscribersCount: 198,
    isOfficial: false,
    specialties: ['XAUUSD'],
    monthlyPrice: 39,
    inviteCode: 'TARIQ2026',
    descriptionAr: 'خبرة 9 سنوات في أسواق السلع والمعادن الثمينة. صفقات يومية دقيقة لا تتجاوز وقف خسارة 15 نقطة مع أهداف تفوق 1:2.5.',
    descriptionEn: '9 years specializing in Spot Gold and precious metals with tight stop losses.',
    signalsCount: 92
  },
  {
    id: 'abu_khaled',
    nameAr: 'أبو خالد (خبير نيويورك)',
    nameEn: 'Abu Khaled (NY Scalp Master)',
    specialtyAr: 'سكالبينج مؤشر ناسداك (US100) • افتتاح بورصة نيويورك',
    specialtyEn: 'Nasdaq Scalping (US100) • New York Open Momentum',
    roleAr: 'محلل شريك معتمد',
    roleEn: 'Certified Partner Analyst',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    verifiedPipsMonth: 620,
    winRate: 81.6,
    subscribersCount: 225,
    isOfficial: false,
    specialties: ['US100'],
    monthlyPrice: 49,
    inviteCode: 'KHALED2026',
    descriptionAr: 'قناص افتتاحات جلسة نيويورك للأسهم والمؤشرات الأمريكية مع استراتيجيات كسر الزخم الحادة وتفريغ كتل الأوامر.',
    descriptionEn: 'Specialist in US equities and indices breakouts during the New York cash open.',
    signalsCount: 114
  },
  {
    id: 'karim_sayed',
    nameAr: 'كريم السيد (محلل السوينغ)',
    nameEn: 'Karim Al-Sayed (Swing Master)',
    specialtyAr: 'صفقات سوينغ متوسطة المدى • EURUSD & العملات الرئيسية',
    specialtyEn: 'Multi-day Swing Setups • Forex Majors & Macro Flow',
    roleAr: 'محلل شريك معتمد',
    roleEn: 'Certified Partner Analyst',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    verifiedPipsMonth: 450,
    winRate: 79.4,
    subscribersCount: 112,
    isOfficial: false,
    specialties: ['EURUSD', 'GBPUSD'],
    monthlyPrice: 29,
    inviteCode: 'KARIM2026',
    descriptionAr: 'التركيز على الصفقات المتأرجحة مع الاتجاه العام لسياسات البنوك المركزية (الفيدرالي، المركزي الأوروبي).',
    descriptionEn: 'Macro-oriented swing trading tracking central bank liquidity cycles.',
    signalsCount: 68
  }
];

// Rich Demo Signal Posts for Traders
const TRADER_POSTS_DATA: Record<string, TraderPost[]> = {
  mbk_master: [
    {
      id: 'post-m1',
      traderId: 'mbk_master',
      traderName: 'MBK Master Institutional Engine',
      traderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      titleAr: 'تأكيد كسر وتفريغ سيولة جلسة نيويورك على ناسداك',
      titleEn: 'Nasdaq NY Session Liquidity Sweep Confirmation',
      symbol: 'US100',
      action: 'BUY',
      entryPrice: 20440.0,
      tp1: 20880.0,
      tp2: 20950.0,
      sl: 20380.0,
      pips: 120,
      status: 'TP2_HIT',
      notesAr: 'تم تحقيق الهدف الثاني بنجاح (+120 نقطة) بعد سحب سيولة قاع لندن وارتداد قوي من منطقة FVG.',
      notesEn: 'TP2 target reached (+120 pips) after London low sweep and strong FVG rejection.',
      timestamp: 'منذ 35 دقيقة',
      likes: 48
    },
    {
      id: 'post-m2',
      traderId: 'mbk_master',
      traderName: 'MBK Master Institutional Engine',
      traderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      titleAr: 'إشارة الذهب: اكتمال الأهداف بالكامل عند 2,684.40',
      titleEn: 'Gold Signal: Full Targets Hit at 2,684.40',
      symbol: 'XAUUSD',
      action: 'BUY',
      entryPrice: 2668.0,
      tp1: 2676.0,
      tp2: 2684.4,
      sl: 2658.0,
      pips: 164,
      status: 'TP2_HIT',
      notesAr: 'صفقة نموذجية حققت أكثر من +164 نقطة مع احترام تام لمستويات الدعم المؤسسي.',
      notesEn: 'Clean institutional setup reaching +164 pips with flawless stop-loss protection.',
      timestamp: 'منذ ساعتين',
      likes: 62
    }
  ],
  captain_tariq: [
    {
      id: 'post-t1',
      traderId: 'captain_tariq',
      traderName: 'كابتن طارق (قناص الذهب)',
      traderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      titleAr: 'إعداد شراء لحظي للذهب من كتلة أوامر 2,674$',
      titleEn: 'Intraday Gold Long Setup from $2,674 Order Block',
      symbol: 'XAUUSD',
      action: 'BUY',
      entryPrice: 2674.0,
      tp1: 2682.0,
      tp2: 2690.0,
      sl: 2667.0,
      pips: 80,
      status: 'TP1_HIT',
      notesAr: 'تم تفعيل الشراء وتحقيق الهدف الأول (+80 نقطة). تم نقل الوقف لنقطة الدخول لحماية الأرباح.',
      notesEn: 'Triggered long with TP1 locked (+80 pips). Stop moved to breakeven.',
      timestamp: 'منذ ساعة',
      likes: 31
    }
  ],
  abu_khaled: [
    {
      id: 'post-k1',
      traderId: 'abu_khaled',
      traderName: 'أبو خالد (خبير نيويورك)',
      traderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      titleAr: 'سكالبينج سريع لناسداك مع جرس افتتاح نيويورك',
      titleEn: 'Nasdaq Scalp with New York Cash Bell',
      symbol: 'US100',
      action: 'BUY',
      entryPrice: 20420.0,
      tp1: 20480.0,
      tp2: 20550.0,
      sl: 20370.0,
      pips: 130,
      status: 'TP2_HIT',
      notesAr: 'حصدنا 130 نقطة خلال 20 دقيقة فقط من الافتتاح. مبروك للجميع.',
      notesEn: 'Banked 130 pips in under 20 minutes from the open. Outstanding execution.',
      timestamp: 'منذ 3 ساعات',
      likes: 54
    }
  ],
  karim_sayed: [
    {
      id: 'post-ks1',
      traderId: 'karim_sayed',
      traderName: 'كريم السيد (محلل السوينغ)',
      traderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      titleAr: 'تحديث اليورو دولار: ارتداد من خط الدعم الأسبوعي',
      titleEn: 'EURUSD Update: Rebound from Weekly Support',
      symbol: 'EURUSD',
      action: 'BUY',
      entryPrice: 1.0835,
      tp1: 1.0875,
      tp2: 1.0920,
      sl: 1.0805,
      pips: 40,
      status: 'ACTIVE',
      notesAr: 'الصفقة مستمرة بإيجابية، نستهدف مستويات 1.0875 كمحطة أولى.',
      notesEn: 'Trade active in profit, targeting 1.0875 first station.',
      timestamp: 'منذ 5 ساعات',
      likes: 22
    }
  ]
};

// Simulated Portfolio Positions
interface SimulatedPosition {
  id: string;
  symbol: MarketSymbol;
  type: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  currentPrice: number;
  floatingPnl: number;
  pips: number;
  openTime: string;
}

// Track Record Audit Trades
interface AuditTrade {
  id: string;
  date: string;
  symbol: MarketSymbol;
  type: 'BUY' | 'SELL';
  entryPrice: string;
  exitPrice: string;
  pips: number;
  riskReward: string;
  status: 'TP_HIT' | 'SL_HIT' | 'BE';
  strategy: string;
}

const AUDIT_TRADES: AuditTrade[] = [
  {
    id: 'AUD-901',
    date: '2026-10-14 14:30',
    symbol: 'US100',
    type: 'BUY',
    entryPrice: '20,440.00',
    exitPrice: '20,560.00',
    pips: 120,
    riskReward: '1 : 2.4',
    status: 'TP_HIT',
    strategy: 'MBK Scalp Breakout & FVG'
  },
  {
    id: 'AUD-902',
    date: '2026-10-14 11:15',
    symbol: 'XAUUSD',
    type: 'BUY',
    entryPrice: '2,668.00',
    exitPrice: '2,684.40',
    pips: 164,
    riskReward: '1 : 2.5',
    status: 'TP_HIT',
    strategy: 'Alligator & Liquidity Sweep'
  },
  {
    id: 'AUD-903',
    date: '2026-10-13 16:20',
    symbol: 'US100',
    type: 'BUY',
    entryPrice: '20,380.00',
    exitPrice: '20,495.00',
    pips: 115,
    riskReward: '1 : 2.3',
    status: 'TP_HIT',
    strategy: 'NY Cash Open Momentum'
  },
  {
    id: 'AUD-904',
    date: '2026-10-13 09:40',
    symbol: 'EURUSD',
    type: 'SELL',
    entryPrice: '1.0875',
    exitPrice: '1.0842',
    pips: 33,
    riskReward: '1 : 3.0',
    status: 'TP_HIT',
    strategy: '50 EMA Institutional Pullback'
  },
  {
    id: 'AUD-905',
    date: '2026-10-12 15:10',
    symbol: 'BTCUSD',
    type: 'BUY',
    entryPrice: '66,800.00',
    exitPrice: '67,900.00',
    pips: 1100,
    riskReward: '1 : 2.2',
    status: 'TP_HIT',
    strategy: 'Order Block Sweep'
  },
  {
    id: 'AUD-906',
    date: '2026-10-11 10:20',
    symbol: 'XAUUSD',
    type: 'BUY',
    entryPrice: '2,652.00',
    exitPrice: '2,670.00',
    pips: 180,
    riskReward: '1 : 2.8',
    status: 'TP_HIT',
    strategy: 'London Session High Breakout'
  }
];

// Macro Economic Event Cards Data
interface MacroEvent {
  id: string;
  nameAr: string;
  nameEn: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM';
  countdown: string;
  forecast: string;
  previous: string;
}

const MACRO_EVENTS: MacroEvent[] = [
  {
    id: 'ev-1',
    nameAr: 'مؤشر أسعار المستهلكين الأمريكي (US CPI YoY)',
    nameEn: 'US CPI Inflation Rate (YoY)',
    currency: 'USD',
    impact: 'HIGH',
    countdown: '02h : 14m',
    forecast: '3.1%',
    previous: '3.2%'
  },
  {
    id: 'ev-2',
    nameAr: 'قرار الفائدة للبنك الفيدرالي الأمريكي (FOMC)',
    nameEn: 'FOMC Interest Rate Decision',
    currency: 'USD',
    impact: 'HIGH',
    countdown: '18h : 45m',
    forecast: '5.25%',
    previous: '5.50%'
  },
  {
    id: 'ev-3',
    nameAr: 'تقرير الوظائف غير الزراعية (US NFP)',
    nameEn: 'US Non-Farm Payrolls (NFP)',
    currency: 'USD',
    impact: 'HIGH',
    countdown: '2d : 06h',
    forecast: '175K',
    previous: '216K'
  },
  {
    id: 'ev-4',
    nameAr: 'بيان السياسة النقدية للبنك المركزي الأوروبي',
    nameEn: 'ECB Monetary Policy Statement',
    currency: 'EUR',
    impact: 'MEDIUM',
    countdown: '3d : 11h',
    forecast: '3.75%',
    previous: '3.75%'
  }
];

export function ProtectedDashboard({
  user,
  tickers,
  signals: initialSignals,
  chatMessages,
  economicEvents,
  selectedSymbol,
  onSelectSymbol,
  onAddSignal,
  onCopySignalToAccount,
  onSendMessage,
  onLikeMessage,
  onLogout,
  onBackToHome,
  onOpenBrokerModal,
  onOpenNewSignalModal,
  onOpenPromoModal,
  isMuted,
  onToggleMute,
  onlineTraders,
  lang = 'ar',
  onToggleLang
}: Props) {
  const isAr = lang === 'ar';
  const isVIP = user.role === 'VIP' || user.role === 'ADMIN' || user.isAdmin;

  // Active Sidebar Workspace Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>('signals');

  // Expanded Chart Card IDs
  const [expandedChartId, setExpandedChartId] = useState<string | null>('card-us100');

  // Copied state feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected Trader Room State (when inside Tab 2)
  const [selectedTrader, setSelectedTrader] = useState<TraderProfile | null>(null);
  const [traderChatInput, setTraderChatInput] = useState('');
  const [traderRoomMessages, setTraderRoomMessages] = useState<
    Array<{ id: string; user: string; text: string; time: string; isAnalyst?: boolean }>
  >([
    {
      id: 'm1',
      user: 'أحمد السعيد',
      text: 'إشارة الناسداك اليوم كانت ممتازة جداً، التزام بالهدف الثاني!',
      time: '14:20'
    },
    {
      id: 'm2',
      user: 'سلطان القحطاني',
      text: 'كابتن، متى أفضل وقت لإعادة الدخول على الذهب بعد سحب السيولة؟',
      time: '14:26'
    },
    {
      id: 'm3',
      user: 'MBK Institutional Analyst',
      text: 'ننتظر إغلاق شمعة الـ 15 دقيقة فوق مستوى 2,678$ لتأكيد استمرار الزخم.',
      time: '14:28',
      isAnalyst: true
    }
  ]);

  // Unlock Trader Code Modal State
  const [unlockTraderModal, setUnlockTraderModal] = useState<TraderProfile | null>(null);
  const [unlockCodeInput, setUnlockCodeInput] = useState('');
  const [unlockCodeError, setUnlockCodeError] = useState(false);
  const [unlockedTraderIds, setUnlockedTraderIds] = useState<string[]>(['mbk_master']);

  // SMC AI Agent Chat State (Tab 5)
  const [aiInput, setAiInput] = useState('');
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'model'; text: string; time: string }>>([
    {
      role: 'model',
      text: isAr
        ? 'أهلاً بك في MBK Smart AI Agent. أنا هنا لتحليل السيولة، مناطق كتل الأوامر (Order Blocks)، وفجوات القيمة العادلة (FVG) لصفقاتك اللحظية. اختر سؤالاً سريعاً أدناه أو اكتب استفسارك مباشرة.'
        : 'Welcome to MBK Smart AI Agent. I provide institutional SMC analysis, Order Blocks, and FVG liquidity intelligence. Select a prompt below or type your question.',
      time: '14:15'
    }
  ]);

  // Paper Trading Simulated Portfolio State (Tab 6)
  const [paperBalance, setPaperBalance] = useState(100000);
  const [paperEquity, setPaperEquity] = useState(104820.5);
  const [paperPositions, setPaperPositions] = useState<SimulatedPosition[]>([
    {
      id: 'pos-1',
      symbol: 'US100',
      type: 'BUY',
      lots: 2.0,
      entryPrice: 20440.0,
      currentPrice: 20560.0,
      floatingPnl: 2400.0,
      pips: 120,
      openTime: '13:45'
    },
    {
      id: 'pos-2',
      symbol: 'XAUUSD',
      type: 'BUY',
      lots: 1.0,
      entryPrice: 2668.0,
      currentPrice: 2684.4,
      floatingPnl: 1640.0,
      pips: 164,
      openTime: '11:20'
    }
  ]);

  // Admin PIN Protection State (Tab 7)
  const [adminPin, setAdminPin] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPinError, setAdminPinError] = useState(false);

  // Admin Signal Publish Form
  const [adminSymbol, setAdminSymbol] = useState<MarketSymbol>('US100');
  const [adminType, setAdminType] = useState<'BUY' | 'SELL'>('BUY');
  const [adminEntry, setAdminEntry] = useState('20440');
  const [adminTp1, setAdminTp1] = useState('20880');
  const [adminTp2, setAdminTp2] = useState('20950');
  const [adminSl, setAdminSl] = useState('20380');
  const [adminStrategy, setAdminStrategy] = useState('MBK Scalp Breakout');
  const [adminPublishSuccess, setAdminPublishSuccess] = useState(false);

  // Admin Generated Codes State
  const [generatedCodes, setGeneratedCodes] = useState<
    Array<{ code: string; type: string; date: string }>
  >([
    { code: 'VIP-9941', type: 'عضوية VIP سنوية', date: 'اليوم' },
    { code: 'TARIQ-2841', type: 'غرفة كابتن طارق', date: 'أمس' },
    { code: 'KHALED-5520', type: 'غرفة أبو خالد', date: 'أمس' }
  ]);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // UTC Server Time
  const [serverTimeUtc, setServerTimeUtc] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setServerTimeUtc(now.toUTCString().slice(17, 25));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handler: Copy Signal Feedback
  const handleCopy = (text: string, id: string) => {
    soundManager.playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Handler: Submit AI Prompt
  const handleSendAiPrompt = (promptText?: string) => {
    const query = promptText || aiInput;
    if (!query.trim()) return;
    soundManager.playClick();

    const userMsg = {
      role: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setAiIsTyping(true);

    setTimeout(() => {
      setAiIsTyping(false);
      soundManager.playSignalPing();

      let reply = '';
      if (query.includes('ذهب') || query.includes('XAU') || query.toLowerCase().includes('gold')) {
        reply = isAr
          ? '【تحليل SMC للذهب XAUUSD】\n• الهيكل اللحظي: صعودي قوي فوق 2,660$.\n• مناطق السيولة (Liquidity Pools): تم سحب سيولة قاع لندن عند 2,668$ بنجاح.\n• كتل الأوامر (Order Blocks): منطقة ارتداد FVG قوية بين 2,674$ و 2,678$.\n• الأهداف: استهداف 2,695$ ثم 2,705$.\n• وقف الخسارة البنيوي: إغلاق شمعة ساعة أسفل 2,662$.'
          : '【XAUUSD Spot Gold SMC Analysis】\n• Bias: Strong Bullish above $2,660.\n• Liquidity Sweep: London lows at $2,668 cleanly swept.\n• Order Block: Bullish FVG active at $2,674 - $2,678.\n• Targets: $2,695 then $2,705.\n• Invalidation: Close below $2,662.';
      } else if (query.includes('ناسداك') || query.includes('US100') || query.toLowerCase().includes('nasdaq')) {
        reply = isAr
          ? '【تحليل SMC لمؤشر ناسداك US100】\n• الهيكل اللحظي: صعودي بعد سحب سيولة البائعين عند 20,420.\n• فجوة القيمة العادلة (FVG): مدعومة بمتوسط EMA 21 عند 20,460.\n• الأهداف: 20,880 (+440 pips) ثم 20,950 (+510 pips).\n• وقف الخسارة: كسر 20,380 يلغي نموذج الشراء.'
          : '【US100 Nasdaq SMC Analysis】\n• Bias: Bullish expansion following seller liquidity sweep at 20,420.\n• Fair Value Gap: Supported by EMA 21 at 20,460.\n• Targets: 20,880 (+440 pips) and 20,950 (+510 pips).\n• Invalidation: 20,380.';
      } else if (query.includes('لوت') || query.toLowerCase().includes('lot') || query.includes('10,000')) {
        reply = isAr
          ? '【حاسبة إدارة المخاطر المؤسسية】\n• رصيد الحساب: 10,000$\n• المخاطرة المسموحة (1%): 100$\n• على ناسداك بوقف 50 نقطة: حجم اللوت الموصى به = 2.0 عقود مايكرو (أو 0.2 ميني).\n• على الذهب بوقف 20 نقطة (2$): حجم اللوت الموصى به = 0.50 لوت ستاندرد.\nقاعدة صارمة: لا تخاطر بأكثر من 1% في أي صفقة منفردة!'
          : '【Institutional Risk Calculator】\n• Balance: $10,000\n• 1% Max Risk: $100\n• US100 (50 pts SL): Recommended 2.0 Micro contracts.\n• Gold (20 pips SL): Recommended 0.50 Standard Lot.\nStrict rule: Never exceed 1% risk per trade!';
      } else {
        reply = isAr
          ? '【تحليل MBK Institutional Engine】\nالاتجاه المؤسسي العام إيجابي مع استقرار شهية المخاطرة في أسواق المؤشرات والذهب. نوصي بالتداول مع اتجاه تدفق السيولة والالتزام بنسبة عائد إلى مخاطرة 1:2.4 كحد أدنى.'
          : '【MBK Institutional Engine】\nMacro sentiment remains favorable with sustained institutional order flow into tech and precious metals. Maintain strict 1:2.4+ Risk/Reward.';
      }

      setAiMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 600);
  };

  // Handler: Close Paper Position
  const handleClosePosition = (posId: string) => {
    soundManager.playProfitChime();
    confetti({ particleCount: 30, spread: 50 });
    const pos = paperPositions.find((p) => p.id === posId);
    if (!pos) return;
    setPaperBalance((prev) => +(prev + pos.floatingPnl).toFixed(2));
    setPaperEquity((prev) => +(prev + pos.floatingPnl).toFixed(2));
    setPaperPositions((prev) => prev.filter((p) => p.id !== posId));
  };

  // Handler: Verify Admin PIN
  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin.trim() === '2026') {
      soundManager.playProfitChime();
      setIsAdminUnlocked(true);
      setAdminPinError(false);
    } else {
      soundManager.playClick();
      setAdminPinError(true);
    }
  };

  // Handler: Publish Signal from Admin Center
  const handleAdminPublishSignal = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playProfitChime();
    confetti({ particleCount: 40, spread: 60 });

    const newSig: TradeSignal = {
      id: `sig-adm-${Date.now()}`,
      symbol: adminSymbol,
      type: adminType,
      entryPrice: parseFloat(adminEntry) || 20440,
      tp1: parseFloat(adminTp1) || 20880,
      tp2: parseFloat(adminTp2) || 20950,
      sl: parseFloat(adminSl) || 20380,
      currentPrice: parseFloat(adminEntry) || 20440,
      pips: 0,
      status: 'ACTIVE',
      riskReward: '1 : 2.5',
      timeframe: '15m',
      confidence: 92,
      strategyName: adminStrategy,
      createdAt: isAr ? 'الآن' : 'Just now',
      verifiedWebhook: true,
      notesAr: `إشارة معتمدة من الإدارة لمنصة MBKdesk على ${adminSymbol}.`,
      channel: 'MANUAL',
      author: 'MBK Institutional Research'
    };

    onAddSignal(newSig);
    setAdminPublishSuccess(true);
    setTimeout(() => setAdminPublishSuccess(false), 3000);
  };

  // Handler: Generate VIP Code
  const handleGenerateCode = (type: string) => {
    soundManager.playClick();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `${type.toUpperCase()}-${rand}`;
    setGeneratedCodes((prev) => [{ code, type, date: isAr ? 'الآن' : 'Just now' }, ...prev]);
    navigator.clipboard.writeText(code);
    setAdminToast(isAr ? `تم نسخ الرمز الجديد: ${code}` : `Copied new code: ${code}`);
    setTimeout(() => setAdminToast(null), 3000);
  };

  // Handler: Send Message in Trader Room
  const handleSendTraderMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traderChatInput.trim()) return;
    soundManager.playClick();
    const newMsg = {
      id: `tm-${Date.now()}`,
      user: user.name || user.email.split('@')[0],
      text: traderChatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setTraderRoomMessages((prev) => [...prev, newMsg]);
    setTraderChatInput('');
  };

  // Handler: Unlock Trader Room with Invite Code
  const handleUnlockTrader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTraderModal) return;
    const inputUpper = unlockCodeInput.trim().toUpperCase();

    if (
      inputUpper === unlockTraderModal.inviteCode.toUpperCase() ||
      inputUpper === 'VIP2026' ||
      inputUpper === 'MBK2026'
    ) {
      soundManager.playProfitChime();
      confetti({ particleCount: 50, spread: 70 });
      setUnlockedTraderIds((prev) => [...prev, unlockTraderModal.id]);
      setSelectedTrader(unlockTraderModal);
      setUnlockTraderModal(null);
      setUnlockCodeInput('');
      setUnlockCodeError(false);
    } else {
      soundManager.playClick();
      setUnlockCodeError(true);
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#131722] text-[#d1d4dc] flex flex-col antialiased selection:bg-[#089981]/30 selection:text-[#089981] ${
        isAr ? 'font-sans' : ''
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. TOP LIVE TICKER TAPE (Zero-error TradingView style ticker) */}
      <HeaderTicker onSelectSymbol={onSelectSymbol} lang={lang} />

      {/* 2. TOP DASHBOARD NAVIGATION BAR */}
      <header className="h-14 bg-[#1e222d] border-b border-[#2a2e39] px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Brand + Back to Home */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white text-[#131722] font-mono font-bold text-sm flex items-center justify-center shadow-sm">
              MBK
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-wide">MBK DESK</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#2a2e39] text-[#089981] border border-[#089981]/30">
                  v3.0 INSTITUTIONAL
                </span>
              </div>
            </div>
          </div>

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="hidden sm:flex items-center gap-1 text-xs text-[#787b86] hover:text-white px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{isAr ? 'الصفحة الرئيسية' : 'Home'}</span>
            </button>
          )}
        </div>

        {/* Right: User Status, Live Traders, Lang, Audio & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Online Traders Counter */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse"></span>
            <span className="text-[#089981] font-bold" dir="ltr">
              +{onlineTraders}
            </span>
            <span className="text-[#787b86] text-[11px]">{isAr ? 'متداول نشط' : 'active'}</span>
          </div>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#131722] border border-[#2a2e39]">
            <div className="w-6 h-6 rounded-full bg-[#2a2e39] border border-[#363a45] flex items-center justify-center text-xs font-bold text-white uppercase">
              {user.name ? user.name[0] : 'U'}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight truncate max-w-[130px]">
                {user.name || user.email.split('@')[0]}
              </div>
              <div className="flex items-center gap-1">
                {isVIP ? (
                  <span className="text-[10px] font-bold text-[#089981] flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-[#089981]" />
                    VIP MEMBER
                  </span>
                ) : (
                  <span className="text-[10px] text-[#787b86]">FREE DEMO</span>
                )}
              </div>
            </div>
          </div>

          {/* VIP Upgrade Button for Free Users */}
          {!isVIP && (
            <button
              onClick={onOpenPromoModal}
              className="px-2.5 py-1 rounded bg-[#089981] hover:bg-[#089981]/80 text-[#131722] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{isAr ? 'تفعيل VIP' : 'Upgrade VIP'}</span>
            </button>
          )}

          {/* Language Toggle */}
          {onToggleLang && (
            <button
              onClick={onToggleLang}
              className="p-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1"
              title={isAr ? 'Switch to English' : 'التحويل للعربية'}
            >
              <Globe className="w-3.5 h-3.5 text-[#089981]" />
              <span className="text-[11px] font-mono">{isAr ? 'EN' : 'عربي'}</span>
            </button>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#f23645]" /> : <Volume2 className="w-4 h-4 text-[#089981]" />}
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="p-1.5 rounded bg-[#131722] hover:bg-[#f23645]/20 border border-[#2a2e39] hover:border-[#f23645]/40 text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer"
            title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2.5 INSTITUTIONAL TELEMETRY STATUS BAR */}
      <div className="h-7 bg-[#0d1017] border-b border-[#2a2e39] px-4 flex items-center justify-between text-[11px] font-mono text-[#787b86] shrink-0 overflow-x-auto whitespace-nowrap select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#089981] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
            <span>EQX-LD4</span>
          </span>
          <span className="text-[#363a45]">|</span>
          <span>
            LATENCY: <strong className="text-white" dir="ltr">0.9ms</strong>
          </span>
          <span className="text-[#363a45]">|</span>
          <span>
            FIX API: <strong className="text-[#089981]">CONNECTED</strong>
          </span>
          <span className="text-[#363a45]">|</span>
          <span>
            FEED: <strong className="text-white">CME / FXCM DIRECT</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            SESSION: <strong className="text-white">NEW YORK / LONDON OVERLAP</strong>
          </span>
          <span className="text-[#363a45]">|</span>
          <span>
            SERVER TIME: <strong className="text-white" dir="ltr">{serverTimeUtc} UTC</strong>
          </span>
        </div>
      </div>

      {/* 3. MAIN TERMINAL WORKSPACE: FIXED SIDEBAR + TAB CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* FIXED SIDEBAR (Desktop) */}
        <aside className="w-64 bg-[#1e222d] border-e border-[#2a2e39] hidden md:flex flex-col justify-between shrink-0 select-none">
          {/* Sidebar Nav Links */}
          <div className="p-2.5 space-y-1 overflow-y-auto">
            {/* Tab 1: Signals Feed */}
            <button
              onClick={() => {
                setActiveTab('signals');
                setSelectedTrader(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'signals'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className={`w-4 h-4 ${activeTab === 'signals' ? 'text-[#131722]' : 'text-[#089981]'}`} />
                <span>{isAr ? '📡 الإشارات الحية' : 'Live Signals'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'signals' ? 'bg-[#131722] text-white' : 'bg-[#089981]/20 text-[#089981]'
                }`}
                dir="ltr"
              >
                +4 LIVE
              </span>
            </button>

            {/* Tab 2: Top Analysts / Traders Marketplace */}
            <button
              onClick={() => {
                setActiveTab('traders');
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'traders'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${activeTab === 'traders' ? 'text-[#131722]' : 'text-white'}`} />
                <span>{isAr ? '🏆 نخبة المحللين' : 'Top Analysts'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'traders' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#d1d4dc]'
                }`}
                dir="ltr"
              >
                4 ROOMS
              </span>
            </button>

            {/* Tab 3: Indicators Store & Pine Script */}
            <button
              onClick={() => {
                setActiveTab('indicators');
                setSelectedTrader(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'indicators'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className={`w-4 h-4 ${activeTab === 'indicators' ? 'text-[#131722]' : 'text-white'}`} />
                <span>{isAr ? '🛍️ متجر المؤشرات' : 'Indicators Store'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activeTab === 'indicators' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#787b86]'
                }`}
              >
                Pine v5
              </span>
            </button>

            {/* Tab 4: Copy Trading & Brokers */}
            <button
              onClick={() => {
                setActiveTab('copy_trading');
                setSelectedTrader(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'copy_trading'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className={`w-4 h-4 ${activeTab === 'copy_trading' ? 'text-[#131722]' : 'text-white'}`} />
                <span>{isAr ? '🤝 نسخ الصفقات والوسطاء' : 'Copy Trading & Brokers'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activeTab === 'copy_trading' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#089981]'
                }`}
              >
                0.0 Pip
              </span>
            </button>

            {/* Tab 5: SMC AI Agent & Assistant */}
            <button
              onClick={() => {
                setActiveTab('ai_agent');
                setSelectedTrader(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ai_agent'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bot className={`w-4 h-4 ${activeTab === 'ai_agent' ? 'text-[#131722]' : 'text-[#089981]'}`} />
                <span>{isAr ? '🤖 وكيل الذكاء الاصطناعي' : 'SMC AI Agent'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activeTab === 'ai_agent' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#089981]'
                }`}
              >
                SMC AI
              </span>
            </button>

            {/* Tab 6: Smart Journal & Paper Desk */}
            <button
              onClick={() => {
                setActiveTab('journal');
                setSelectedTrader(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className={`w-4 h-4 ${activeTab === 'journal' ? 'text-[#131722]' : 'text-white'}`} />
                <span>{isAr ? '📓 مفكرة التداول ومحفظة $100K' : 'Journal & $100K Desk'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'journal' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#089981]'
                }`}
                dir="ltr"
              >
                +$4.8K
              </span>
            </button>
          </div>

          {/* Bottom Sidebar: Admin / CEO Command Center Link */}
          <div className="p-2.5 border-t border-[#2a2e39]">
            <button
              onClick={() => {
                setActiveTab('admin');
                setSelectedTrader(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#787b86] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>{isAr ? '⚙️ لوحة الإدارة' : 'Command Center'}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#2a2e39] text-[#787b86]">
                PIN 2026
              </span>
            </button>
          </div>
        </aside>

        {/* MOBILE TOP TAB BAR (Sticky for Mobile Users) */}
        <div className="md:hidden flex items-center gap-1.5 p-2 bg-[#1e222d] border-b border-[#2a2e39] overflow-x-auto shrink-0 select-none">
          <button
            onClick={() => {
              setActiveTab('signals');
              setSelectedTrader(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'signals' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '📡 الإشارات' : 'Signals'}
          </button>
          <button
            onClick={() => {
              setActiveTab('traders');
              setSelectedTrader(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'traders' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '🏆 المحللين' : 'Analysts'}
          </button>
          <button
            onClick={() => {
              setActiveTab('indicators');
              setSelectedTrader(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'indicators' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '🛍️ المؤشرات' : 'Indicators'}
          </button>
          <button
            onClick={() => {
              setActiveTab('copy_trading');
              setSelectedTrader(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'copy_trading' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '🤝 نسخ الصفقات' : 'Copy'}
          </button>
          <button
            onClick={() => {
              setActiveTab('ai_agent');
              setSelectedTrader(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'ai_agent' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '🤖 الذكاء الاصطناعي' : 'AI'}
          </button>
          <button
            onClick={() => {
              setActiveTab('journal');
              setSelectedTrader(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'journal' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '📓 المفكرة' : 'Journal'}
          </button>
          <button
            onClick={() => {
              setActiveTab('admin');
              setSelectedTrader(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'admin' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '⚙️ الإدارة' : 'Admin'}
          </button>
        </div>

        {/* WORKSPACE MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-[#131722] relative p-3 sm:p-5">
          {/* ======================================================== */}
          {/* TAB 1: 📡 LIVE SIGNALS & AUDITED TRACK RECORD */}
          {/* ======================================================== */}
          {activeTab === 'signals' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#089981] animate-ping" />
                    <h1 className="text-base sm:text-lg font-bold text-white">
                      {isAr ? 'إشارات التداول المؤسسية الحية' : 'Live Institutional Signals Stream'}
                    </h1>
                  </div>
                  <p className="text-xs text-[#787b86]">
                    {isAr
                      ? 'بث مباشر لتوصيات المحرك الآلي وفريق أبحاث MBK مع تدقيق فوري لمستويات الدخول والأهداف.'
                      : 'Live algorithmic alerts and verified research team trades with real-time audit.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded bg-[#131722] border border-[#2a2e39] font-mono text-xs text-[#089981] font-bold" dir="ltr">
                    +1,420 Pips Verified
                  </span>
                  <button
                    onClick={onOpenNewSignalModal}
                    className="px-3 py-1.5 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'نشر توصية' : 'Post Signal'}</span>
                  </button>
                </div>
              </div>

              {/* 1.1 ACTIVE LIVE SIGNAL CARDS WITH EXPANDABLE CHART & COPY */}
              <div className="space-y-4">
                <h2 className="text-xs font-mono font-bold text-[#787b86] uppercase tracking-wider">
                  {isAr ? 'الصفقات النشطة قيد المتابعة' : 'ACTIVE EXECUTIONS'}
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Card 1: US100 */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col justify-between hover:border-[#363a45] transition-all">
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#089981]/15 text-[#089981] border border-[#089981]/30">
                            BUY
                          </span>
                          <span className="text-base font-mono font-bold text-white tracking-wide">
                            US100
                          </span>
                          <span className="text-[11px] text-[#787b86] font-mono">15m</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-[#089981]/10 text-[#089981] border border-[#089981]/30 text-xs font-mono font-bold flex items-center gap-1" dir="ltr">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#089981]" />
                            <span>🎯 TP2 HIT • +120 Pips</span>
                          </span>
                        </div>
                      </div>

                      {/* Strategy & Author */}
                      <div className="text-xs text-[#787b86] mb-3 flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                        <span>MBK Scalp Breakout & Liquidity Sweep</span>
                        <span className="text-[#089981] font-mono text-[11px]" dir="ltr">R:R 1 : 2.4</span>
                      </div>

                      {/* Numerical Levels Matrix */}
                      <div className="grid grid-cols-4 gap-2 mb-3 font-mono text-center">
                        <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                          <div className="text-[10px] text-[#787b86]">ENTRY</div>
                          <div className="text-xs font-bold text-white" dir="ltr">20,440.00</div>
                        </div>
                        <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                          <div className="text-[10px] text-[#f23645]">SL</div>
                          <div className="text-xs font-bold text-[#f23645]" dir="ltr">20,380.00</div>
                        </div>
                        <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                          <div className="text-[10px] text-[#089981]">TP1</div>
                          <div className="text-xs font-bold text-[#089981]" dir="ltr">20,880.00</div>
                        </div>
                        <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                          <div className="text-[10px] text-[#089981]">TP2</div>
                          <div className="text-xs font-bold text-[#089981]" dir="ltr">20,950.00</div>
                        </div>
                      </div>

                      <p className="text-xs text-[#787b86] leading-relaxed mb-3">
                        {isAr
                          ? 'سحب سيولة قاع لندن بدقة عند 20,420 مع تأكيد شمعة الـ 15 دقيقة فوق خط المتوسط. تم ضرب الهدف الثاني بنجاح.'
                          : 'Clean London low liquidity sweep at 20,420 followed by bullish continuation above 21 EMA.'}
                      </p>
                    </div>

                    {/* Actions & Expandable Chart Toggle */}
                    <div className="space-y-3 pt-2 border-t border-[#2a2e39]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedChartId(expandedChartId === 'card-us100' ? null : 'card-us100')}
                          className="flex-1 py-1.5 px-3 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-[#089981]" />
                          <span>
                            {expandedChartId === 'card-us100'
                              ? isAr ? 'إخفاء الشارت' : 'Hide Chart'
                              : isAr ? 'عرض الشارت التفاعلي' : 'Expand Chart'}
                          </span>
                        </button>

                        <button
                          onClick={() => handleCopy('US100 BUY @ 20,440 | TP1: 20,880 | TP2: 20,950 | SL: 20,380', 'us100')}
                          className={`py-1.5 px-4 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            copiedId === 'us100' ? 'bg-[#089981] text-[#131722]' : 'bg-white text-[#131722] hover:bg-[#d1d4dc]'
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedId === 'us100' ? (isAr ? '✓ تم النسخ' : 'Copied!') : (isAr ? 'نسخ التوصية' : 'Copy')}</span>
                        </button>
                      </div>

                      {/* Expandable Chart Frame */}
                      {expandedChartId === 'card-us100' && (
                        <div className="pt-2 border-t border-[#2a2e39] animate-fade-in">
                          <div className="h-64 w-full rounded overflow-hidden border border-[#2a2e39]">
                            <TradingViewChart
                              symbol="US100"
                              onSymbolChange={onSelectSymbol}
                              tickers={tickers}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: XAUUSD */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col justify-between hover:border-[#363a45] transition-all">
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#089981]/15 text-[#089981] border border-[#089981]/30">
                            BUY
                          </span>
                          <span className="text-base font-mono font-bold text-white tracking-wide">
                            XAUUSD
                          </span>
                          <span className="text-[11px] text-[#787b86] font-mono">1h</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-[#089981]/10 text-[#089981] border border-[#089981]/30 text-xs font-mono font-bold flex items-center gap-1" dir="ltr">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#089981]" />
                            <span>🎯 ALL TARGETS HIT • +164 Pips</span>
                          </span>
                        </div>
                      </div>

                      {/* Strategy & Author */}
                      <div className="text-xs text-[#787b86] mb-3 flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                        <span>MBK Alligator & Fair Value Gap Suite</span>
                        <span className="text-[#089981] font-mono text-[11px]" dir="ltr">R:R 1 : 2.5</span>
                      </div>

                      {/* Numerical Levels Matrix */}
                      <div className="grid grid-cols-4 gap-2 mb-3 font-mono text-center">
                        <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                          <div className="text-[10px] text-[#787b86]">ENTRY</div>
                          <div className="text-xs font-bold text-white" dir="ltr">2,668.00</div>
                        </div>
                        <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                          <div className="text-[10px] text-[#f23645]">SL</div>
                          <div className="text-xs font-bold text-[#f23645]" dir="ltr">2,658.00</div>
                        </div>
                        <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                          <div className="text-[10px] text-[#089981]">TP1</div>
                          <div className="text-xs font-bold text-[#089981]" dir="ltr">2,676.00</div>
                        </div>
                        <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                          <div className="text-[10px] text-[#089981]">TP2</div>
                          <div className="text-xs font-bold text-[#089981]" dir="ltr">2,684.40</div>
                        </div>
                      </div>

                      <p className="text-xs text-[#787b86] leading-relaxed mb-3">
                        {isAr
                          ? 'ارتداد دقيق من فجوة القيمة العادلة المؤسسية (FVG) عند 2,668$ مع حصد كامل الأهداف (+164 نقطة).'
                          : 'Flawless institutional FVG bounce at $2,668 achieving complete target execution (+164 pips).'}
                      </p>
                    </div>

                    {/* Actions & Expandable Chart Toggle */}
                    <div className="space-y-3 pt-2 border-t border-[#2a2e39]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedChartId(expandedChartId === 'card-xau' ? null : 'card-xau')}
                          className="flex-1 py-1.5 px-3 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-[#089981]" />
                          <span>
                            {expandedChartId === 'card-xau'
                              ? isAr ? 'إخفاء الشارت' : 'Hide Chart'
                              : isAr ? 'عرض الشارت التفاعلي' : 'Expand Chart'}
                          </span>
                        </button>

                        <button
                          onClick={() => handleCopy('XAUUSD BUY @ 2,668.00 | TP1: 2,676.00 | TP2: 2,684.40 | SL: 2,658.00', 'xauusd')}
                          className={`py-1.5 px-4 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            copiedId === 'xauusd' ? 'bg-[#089981] text-[#131722]' : 'bg-white text-[#131722] hover:bg-[#d1d4dc]'
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedId === 'xauusd' ? (isAr ? '✓ تم النسخ' : 'Copied!') : (isAr ? 'نسخ التوصية' : 'Copy')}</span>
                        </button>
                      </div>

                      {/* Expandable Chart Frame */}
                      {expandedChartId === 'card-xau' && (
                        <div className="pt-2 border-t border-[#2a2e39] animate-fade-in">
                          <div className="h-64 w-full rounded overflow-hidden border border-[#2a2e39]">
                            <TradingViewChart
                              symbol="XAUUSD"
                              onSymbolChange={onSelectSymbol}
                              tickers={tickers}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 1.2 MONTHLY PERFORMANCE SUMMARY CARDS & VERIFIED AUDIT TABLE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono font-bold text-[#787b86] uppercase tracking-wider">
                    {isAr ? 'سجل الأداء وتدقيق الصفقات المعتمدة' : 'AUDITED PERFORMANCE & TRACK RECORD'}
                  </h2>
                  <span className="text-xs font-mono text-[#089981]" dir="ltr">
                    Win Rate: 84.5%
                  </span>
                </div>

                {/* Monthly Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3">
                    <div className="text-[11px] text-[#787b86] mb-1">{isAr ? 'يناير 2026' : 'Jan 2026'}</div>
                    <div className="text-lg font-mono font-bold text-[#089981]" dir="ltr">+410 Pips</div>
                    <div className="text-[10px] text-[#787b86] mt-0.5" dir="ltr">28 Trades • 82.4% WR</div>
                  </div>
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3">
                    <div className="text-[11px] text-[#787b86] mb-1">{isAr ? 'فبراير 2026' : 'Feb 2026'}</div>
                    <div className="text-lg font-mono font-bold text-[#089981]" dir="ltr">+390 Pips</div>
                    <div className="text-[10px] text-[#787b86] mt-0.5" dir="ltr">24 Trades • 78.9% WR</div>
                  </div>
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3">
                    <div className="text-[11px] text-[#787b86] mb-1">{isAr ? 'مارس 2026' : 'Mar 2026'}</div>
                    <div className="text-lg font-mono font-bold text-[#089981]" dir="ltr">+620 Pips</div>
                    <div className="text-[10px] text-[#787b86] mt-0.5" dir="ltr">31 Trades • 85.2% WR</div>
                  </div>
                  <div className="bg-[#1e222d] border border-[#089981]/40 rounded-lg p-3 bg-gradient-to-br from-[#1e222d] to-[#089981]/10">
                    <div className="text-[11px] text-[#089981] font-semibold mb-1">{isAr ? 'الإجمالي التراكمي' : 'Total Verified'}</div>
                    <div className="text-lg font-mono font-bold text-white" dir="ltr">+1,420 Pips</div>
                    <div className="text-[10px] text-[#089981] mt-0.5" dir="ltr">Max DD: 3.8%</div>
                  </div>
                </div>

                {/* Audit Table */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs font-mono">
                      <thead className="bg-[#131722] text-[#787b86] border-b border-[#2a2e39] select-none text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 text-start">ID / TIME</th>
                          <th className="py-2.5 px-3 text-start">ASSET</th>
                          <th className="py-2.5 px-2 text-start">TYPE</th>
                          <th className="py-2.5 px-3 text-start font-sans">{isAr ? 'الاستراتيجية' : 'STRATEGY'}</th>
                          <th className="py-2.5 px-3 text-start">ENTRY</th>
                          <th className="py-2.5 px-3 text-start">EXIT</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'النقاط المحققة' : 'PIPS'}</th>
                          <th className="py-2.5 px-3 text-start">R:R</th>
                          <th className="py-2.5 px-3 text-end">{isAr ? 'الحالة' : 'STATUS'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2e39]/60">
                        {AUDIT_TRADES.map((trade) => (
                          <tr key={trade.id} className="hover:bg-[#2a2e39]/30 transition-colors">
                            <td className="py-2.5 px-3 text-[#787b86]">{trade.date}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{trade.symbol}</td>
                            <td className="py-2.5 px-2">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  trade.type === 'BUY'
                                    ? 'bg-[#089981]/15 text-[#089981]'
                                    : 'bg-[#f23645]/15 text-[#f23645]'
                                }`}
                              >
                                {trade.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-[#d1d4dc] font-sans truncate max-w-[180px]">
                              {trade.strategy}
                            </td>
                            <td className="py-2.5 px-3 text-white" dir="ltr">{trade.entryPrice}</td>
                            <td className="py-2.5 px-3 text-white" dir="ltr">{trade.exitPrice}</td>
                            <td className="py-2.5 px-3 text-[#089981] font-bold" dir="ltr">
                              +{trade.pips} Pips
                            </td>
                            <td className="py-2.5 px-3 text-[#787b86]" dir="ltr">{trade.riskReward}</td>
                            <td className="py-2.5 px-3 text-end">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#089981]/15 text-[#089981] border border-[#089981]/30">
                                ✓ VERIFIED
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 1.3 MACRO ECONOMIC CALENDAR CARDS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono font-bold text-[#787b86] uppercase tracking-wider">
                    {isAr ? 'الأجندة الاقتصادية اللحظية والأحداث عالية التأثير' : 'MACRO ECONOMIC CALENDAR & RADAR'}
                  </h2>
                  <span className="text-[11px] text-[#787b86] font-mono">Live UTC Sync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {MACRO_EVENTS.map((ev) => (
                    <div key={ev.id} className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-[#131722] border border-[#2a2e39]">
                          {ev.currency}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            ev.impact === 'HIGH'
                              ? 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30'
                              : 'bg-[#787b86]/20 text-[#d1d4dc]'
                          }`}
                        >
                          {ev.impact} IMPACT
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-white leading-snug">
                        {isAr ? ev.nameAr : ev.nameEn}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#2a2e39] text-xs font-mono">
                        <div className="text-[11px] text-[#787b86]">
                          Forecast: <span className="text-white font-bold">{ev.forecast}</span>
                        </div>
                        <div className="text-[11px] text-[#089981] font-bold flex items-center gap-1" dir="ltr">
                          <Clock className="w-3 h-3 text-[#089981]" />
                          <span>{ev.countdown}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: 🏆 TRADERS MARKETPLACE & PRIVATE ROOMS */}
          {/* ======================================================== */}
          {activeTab === 'traders' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {!selectedTrader ? (
                <>
                  {/* Directory Header */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-base sm:text-lg font-bold text-white mb-1">
                        {isAr ? 'نخبة المحللين المعتمدين وغرف التداول الحصرية' : 'Certified Analysts Marketplace'}
                      </h1>
                      <p className="text-xs text-[#787b86]">
                        {isAr
                          ? 'تابع أفضل المتداولين، ادخل غرفهم الخاصة، واطلع على تحليلاتهم ونقاشات المشتركين لحظياً.'
                          : 'Follow verified traders, access private hubs, and engage in real-time subscriber chats.'}
                      </p>
                    </div>

                    <div className="text-xs font-mono text-[#089981] bg-[#131722] border border-[#2a2e39] px-3 py-1.5 rounded">
                      <span>{unlockedTraderIds.length} {isAr ? 'غرف مفعلة لديك' : 'Rooms Unlocked'}</span>
                    </div>
                  </div>

                  {/* Traders Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INITIAL_TRADERS.map((trader) => {
                      const isUnlocked = isVIP || unlockedTraderIds.includes(trader.id);

                      return (
                        <div
                          key={trader.id}
                          className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col justify-between hover:border-[#363a45] transition-all space-y-4"
                        >
                          <div>
                            {/* Trader Top Bar */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={trader.avatar}
                                  alt={trader.nameAr}
                                  className="w-12 h-12 rounded-full border border-[#363a45] object-cover"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-white text-sm">
                                      {isAr ? trader.nameAr : trader.nameEn}
                                    </h3>
                                    {trader.isOfficial && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#089981]/20 text-[#089981]">
                                        OFFICIAL
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#787b86]">{isAr ? trader.specialtyAr : trader.specialtyEn}</p>
                                </div>
                              </div>

                              <div className="text-end font-mono">
                                <div className="text-sm font-bold text-white">
                                  {trader.monthlyPrice === 0 ? (isAr ? 'مجاناً مع المنصة' : 'Included') : `$${trader.monthlyPrice}/mo`}
                                </div>
                                <div className="text-[10px] text-[#787b86]">{trader.subscribersCount} {isAr ? 'مشترك' : 'subs'}</div>
                              </div>
                            </div>

                            {/* Trader Performance Metrics */}
                            <div className="grid grid-cols-3 gap-2 bg-[#131722] p-2.5 rounded border border-[#2a2e39] text-center font-mono text-xs mb-3">
                              <div>
                                <div className="text-[10px] text-[#787b86]">{isAr ? 'النقاط الشهرية' : 'Monthly Pips'}</div>
                                <div className="font-bold text-[#089981]" dir="ltr">+{trader.verifiedPipsMonth}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-[#787b86]">{isAr ? 'نسبة النجاح' : 'Win Rate'}</div>
                                <div className="font-bold text-white" dir="ltr">{trader.winRate}%</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-[#787b86]">{isAr ? 'إجمالي الصفقات' : 'Signals'}</div>
                                <div className="font-bold text-white" dir="ltr">{trader.signalsCount}</div>
                              </div>
                            </div>

                            <p className="text-xs text-[#787b86] leading-relaxed line-clamp-2">
                              {isAr ? trader.descriptionAr : trader.descriptionEn}
                            </p>
                          </div>

                          {/* Action Button */}
                          <div className="pt-2 border-t border-[#2a2e39]">
                            {isUnlocked ? (
                              <button
                                onClick={() => {
                                  setSelectedTrader(trader);
                                  soundManager.playClick();
                                }}
                                className="w-full py-2 px-3 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Unlock className="w-3.5 h-3.5 text-[#089981]" />
                                <span>{isAr ? 'دخول غرفة المحلل المباشرة' : 'Enter Private Room'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setUnlockTraderModal(trader);
                                  soundManager.playClick();
                                }}
                                className="w-full py-2 px-3 rounded bg-[#2a2e39] hover:bg-[#363a45] text-white border border-[#363a45] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5 text-[#787b86]" />
                                <span>{isAr ? 'فتح الغرفة برمز الدعوة / اشتراك' : 'Unlock with Invite Code'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Dedicated Private Trader Room Workspace */
                <div className="space-y-4">
                  {/* Trader Room Header */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedTrader.avatar}
                        alt={selectedTrader.nameAr}
                        className="w-12 h-12 rounded-full border border-[#363a45] object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-white">
                            {isAr ? selectedTrader.nameAr : selectedTrader.nameEn}
                          </h2>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#089981]/20 text-[#089981]">
                            LIVE ROOM
                          </span>
                        </div>
                        <p className="text-xs text-[#787b86]">{isAr ? selectedTrader.specialtyAr : selectedTrader.specialtyEn}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTrader(null)}
                        className="px-3 py-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                        <span>{isAr ? 'العودة للدليل' : 'Back to Directory'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 2-Column Grid: Left Column (Chat) & Right Column (Signals/Chart) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Trader Signals & Chart (2 Cols) */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Active Posts by this Trader */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-mono font-bold text-[#787b86] uppercase tracking-wider">
                          {isAr ? 'التوصيات الحصرية لغرفة المحلل' : 'ANALYST POSTS & SIGNALS'}
                        </h3>

                        {(TRADER_POSTS_DATA[selectedTrader.id] || TRADER_POSTS_DATA['mbk_master']).map((post) => (
                          <div key={post.id} className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-mono">
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#089981]/15 text-[#089981]">
                                  {post.action}
                                </span>
                                <span className="font-bold text-white text-sm">{post.symbol}</span>
                                <span className="text-xs text-[#787b86] font-sans">{post.timestamp}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-[#089981]/10 text-[#089981] font-mono text-xs font-bold" dir="ltr">
                                +{post.pips} Pips
                              </span>
                            </div>

                            <div className="text-sm font-semibold text-white">{isAr ? post.titleAr : post.titleEn}</div>

                            <div className="grid grid-cols-4 gap-2 bg-[#131722] p-2 rounded border border-[#2a2e39] font-mono text-xs text-center">
                              <div>
                                <span className="text-[10px] text-[#787b86]">ENTRY:</span> <span className="text-white font-bold" dir="ltr">{post.entryPrice}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#f23645]">SL:</span> <span className="text-[#f23645] font-bold" dir="ltr">{post.sl}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#089981]">TP1:</span> <span className="text-[#089981] font-bold" dir="ltr">{post.tp1}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#089981]">TP2:</span> <span className="text-[#089981] font-bold" dir="ltr">{post.tp2}</span>
                              </div>
                            </div>

                            <p className="text-xs text-[#787b86] leading-relaxed">
                              {isAr ? post.notesAr : post.notesEn}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Interactive TradingView Chart */}
                      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3 space-y-2">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{isAr ? 'شارت التحليل المباشر' : 'Live Interactive Chart'}</span>
                          <span className="font-mono text-[11px] text-[#787b86]">TradingView Embed</span>
                        </div>
                        <div className="h-80 w-full rounded overflow-hidden border border-[#2a2e39]">
                          <TradingViewChart
                            symbol={(selectedTrader.specialties[0] as MarketSymbol) || 'US100'}
                            onSymbolChange={onSelectSymbol}
                            tickers={tickers}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Private Subscriber Chat Room (1 Col) */}
                    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg flex flex-col h-[580px]">
                      <div className="p-3 border-b border-[#2a2e39] bg-[#131722] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse" />
                          <span className="text-xs font-bold text-white">{isAr ? 'شات المشتركين الخاص' : 'Subscriber Chat'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#787b86]">Live Feed</span>
                      </div>

                      {/* Messages Feed */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {traderRoomMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-2.5 rounded text-xs leading-relaxed ${
                              msg.isAnalyst
                                ? 'bg-[#089981]/15 border border-[#089981]/30 text-white'
                                : 'bg-[#131722] border border-[#2a2e39] text-[#d1d4dc]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1 text-[11px]">
                              <span className={`font-bold ${msg.isAnalyst ? 'text-[#089981]' : 'text-white'}`}>
                                {msg.user}
                              </span>
                              <span className="text-[10px] text-[#787b86] font-mono">{msg.time}</span>
                            </div>
                            <p>{msg.text}</p>
                          </div>
                        ))}
                      </div>

                      {/* Input Box */}
                      <form onSubmit={handleSendTraderMessage} className="p-2 border-t border-[#2a2e39] bg-[#131722] flex gap-2">
                        <input
                          type="text"
                          value={traderChatInput}
                          onChange={(e) => setTraderChatInput(e.target.value)}
                          placeholder={isAr ? 'اكتب رسالتك للمحلل والمشتركين...' : 'Send message...'}
                          className="flex-1 bg-[#1e222d] border border-[#2a2e39] rounded px-3 py-1.5 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-[#089981]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: 🛍️ INDICATORS STORE & PINE SCRIPT TOOLS */}
          {/* ======================================================== */}
          {activeTab === 'indicators' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white mb-1">
                    {isAr ? 'حزمة مؤشرات MBK الخوارزمية (Pine Script v5)' : 'MBK Proprietary Indicators Suite'}
                  </h1>
                  <p className="text-xs text-[#787b86]">
                    {isAr
                      ? 'مؤشرات مؤسسية مبرمجة لمنصة TradingView لاكتشاف كتل الأوامر وفجوات السعر وتحديد اتجاه السيولة بدقة.'
                      : 'Institutional TradingView scripts detecting Order Blocks, FVGs, and session liquidity sweeps.'}
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded bg-[#131722] border border-[#2a2e39] text-xs font-mono text-[#089981] font-bold">
                  {isVIP ? (isAr ? '✓ مفعلة بحسابك' : 'VIP Active') : (isAr ? 'متاحة مع VIP' : 'Included in VIP')}
                </span>
              </div>

              {/* Indicators Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Indicator 1 */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#089981] px-2 py-0.5 rounded bg-[#089981]/15">
                      PINE SCRIPT v5
                    </span>
                    <span className="text-xs font-mono text-white font-bold">{isAr ? 'مجاناً مع VIP' : 'Included with VIP'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'MBK Smart Money Suite (SMC 2026)' : 'MBK Smart Money Suite (SMC 2026)'}
                  </h3>
                  <p className="text-xs text-[#787b86] leading-relaxed">
                    {isAr
                      ? 'رسم تلقائي لمناطق كتل الأوامر (Order Blocks)، فجوات القيمة العادلة (FVG)، وكسر وتغيير هيكل السوق (BOS / CHoCH).'
                      : 'Automated plotting of institutional Order Blocks, Fair Value Gaps, and structural shifts.'}
                  </p>
                  <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between">
                    <button
                      onClick={() => handleCopy('//@version=5\nindicator("MBK Smart Money Concepts", overlay=true)\n// Institutional OB & FVG Suite', 'pine1')}
                      className="px-3 py-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === 'pine1' ? (isAr ? '✓ تم النسخ' : 'Copied') : (isAr ? 'نسخ كود باين سكريبت' : 'Copy Pine Script')}</span>
                    </button>
                    <a
                      href="https://www.tradingview.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#787b86] hover:text-white flex items-center gap-1"
                    >
                      <span>TradingView ↗</span>
                    </a>
                  </div>
                </div>

                {/* Indicator 2 */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#089981] px-2 py-0.5 rounded bg-[#089981]/15">
                      PINE SCRIPT v5
                    </span>
                    <span className="text-xs font-mono text-white font-bold">{isAr ? 'مجاناً مع VIP' : 'Included with VIP'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'MBK Precision Ribbon & Volume Profile' : 'MBK Precision Ribbon & Volume Profile'}
                  </h3>
                  <p className="text-xs text-[#787b86] leading-relaxed">
                    {isAr
                      ? 'شرائط الزخم الديناميكية (EMA 21/50/200) متزامنة مع قنوات سيولة التداول لتحديد الإجهاد السعري والانعكاس.'
                      : 'Dynamic institutional trend ribbons and momentum exhaustion triggers synchronized with delta volume.'}
                  </p>
                  <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between">
                    <button
                      onClick={() => handleCopy('//@version=5\nindicator("MBK Precision Ribbon", overlay=true)', 'pine2')}
                      className="px-3 py-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === 'pine2' ? (isAr ? '✓ تم النسخ' : 'Copied') : (isAr ? 'نسخ كود باين سكريبت' : 'Copy Pine Script')}</span>
                    </button>
                    <a
                      href="https://www.tradingview.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#787b86] hover:text-white flex items-center gap-1"
                    >
                      <span>TradingView ↗</span>
                    </a>
                  </div>
                </div>

                {/* Indicator 3 */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#089981] px-2 py-0.5 rounded bg-[#089981]/15">
                      PINE SCRIPT v5
                    </span>
                    <span className="text-xs font-mono text-white font-bold">{isAr ? 'مجاناً مع VIP' : 'Included with VIP'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'MBK Session Liquidity & Killzones Box' : 'MBK Session Liquidity & Killzones Box'}
                  </h3>
                  <p className="text-xs text-[#787b86] leading-relaxed">
                    {isAr
                      ? 'تحديد تلقائي لجلسات طوكيو ولندن ونيويورك مع خطوط سحب السيولة اللحظية اليومية والأسبوعية.'
                      : 'Automatic highlighting of London and NY killzones with previous day/week high-low liquidity.'}
                  </p>
                  <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between">
                    <button
                      onClick={() => handleCopy('//@version=5\nindicator("MBK Killzones Box", overlay=true)', 'pine3')}
                      className="px-3 py-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === 'pine3' ? (isAr ? '✓ تم النسخ' : 'Copied') : (isAr ? 'نسخ كود باين سكريبت' : 'Copy Pine Script')}</span>
                    </button>
                    <a
                      href="https://www.tradingview.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#787b86] hover:text-white flex items-center gap-1"
                    >
                      <span>TradingView ↗</span>
                    </a>
                  </div>
                </div>

                {/* Indicator 4 */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#089981] px-2 py-0.5 rounded bg-[#089981]/15">
                      PINE SCRIPT v5
                    </span>
                    <span className="text-xs font-mono text-white font-bold">{isAr ? 'مجاناً مع VIP' : 'Included with VIP'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'MBK Webhook Signals Bridge' : 'MBK Webhook Signals Bridge'}
                  </h3>
                  <p className="text-xs text-[#787b86] leading-relaxed">
                    {isAr
                      ? 'كود ربط تنبيهات TradingView مع خادم MBKtrading لإرسال الصفقات مباشرة إلى المنصة عبر Webhook.'
                      : 'TradingView webhook alert integration template broadcasting directly to the live terminal.'}
                  </p>
                  <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between">
                    <button
                      onClick={() => handleCopy('https://ais-dev-wncejxgfjzqoofgs6snjvu-6705890240.us-east5.run.app/api/webhook/signal?secret=MBK_WEBHOOK_SECRET_2026', 'whcode')}
                      className="px-3 py-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === 'whcode' ? (isAr ? '✓ تم النسخ' : 'Copied') : (isAr ? 'نسخ رابط Webhook URL' : 'Copy Webhook URL')}</span>
                    </button>
                    <span className="text-[11px] text-[#089981] font-mono">PORT 3000 API</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: 🤝 COPY TRADING & RECOMMENDED BROKERS */}
          {/* ======================================================== */}
          {activeTab === 'copy_trading' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white mb-1">
                    {isAr ? 'نسخ الصفقات الآلي والوسطاء المعتمدين' : 'Automated Copy Trading & Partner Brokers'}
                  </h1>
                  <p className="text-xs text-[#787b86]">
                    {isAr
                      ? 'ربط حساب التداول الشخصي مع محرك MBK للتنفيذ اللحظي بفوارق أسعار صفرية وتنفيذ عالي السرعة.'
                      : 'Direct account sync with MBK Execution Engine offering 0.0 pip spreads and ultra-low latency.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#089981] animate-pulse" />
                  <span className="text-xs font-mono font-bold text-[#089981]">BRIDGE ACTIVE • 0.9ms</span>
                </div>
              </div>

              {/* Recommended Brokers Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Broker 1 */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#089981]/15 text-[#089981]">
                        RAW SPREAD
                      </span>
                      <span className="text-xs font-mono text-white font-bold" dir="ltr">0.0 Pips</span>
                    </div>
                    <h3 className="text-base font-bold text-white">IC Markets Global</h3>
                    <ul className="text-xs text-[#787b86] space-y-1.5 font-sans">
                      <li>• فوارق سعرية تبدأ من 0.0 نقطة على الذهب والنازداك</li>
                      <li>• خوادم Equinix LD4 في لندن متصلة بمحرك MBK</li>
                      <li>• رافعة مالية مرنة تصل حتى 1:500</li>
                    </ul>
                  </div>
                  <button
                    onClick={onOpenBrokerModal}
                    className="w-full py-2 px-3 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    {isAr ? 'فتح حساب برعاية MBK' : 'Open Account with MBK'}
                  </button>
                </div>

                {/* Broker 2 */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#089981]/15 text-[#089981]">
                        INSTANT PAY
                      </span>
                      <span className="text-xs font-mono text-white font-bold" dir="ltr">Zero Swap</span>
                    </div>
                    <h3 className="text-base font-bold text-white">Exness Pro</h3>
                    <ul className="text-xs text-[#787b86] space-y-1.5 font-sans">
                      <li>• سحب وإيداع فوري عبر البنوك المحلية والعملات المشفرة</li>
                      <li>• حسابات إسلامية خالية تماماً من فوائد التبييت (Swap-Free)</li>
                      <li>• تنفيذ سريع ومستقر حتى أثناء الأخبار القوية</li>
                    </ul>
                  </div>
                  <button
                    onClick={onOpenBrokerModal}
                    className="w-full py-2 px-3 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    {isAr ? 'فتح حساب معتمد' : 'Open Certified Account'}
                  </button>
                </div>

                {/* Broker 3 */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#089981]/15 text-[#089981]">
                        cTRADER & FIX
                      </span>
                      <span className="text-xs font-mono text-white font-bold" dir="ltr">1ms VPS</span>
                    </div>
                    <h3 className="text-base font-bold text-white">Pepperstone Razor</h3>
                    <ul className="text-xs text-[#787b86] space-y-1.5 font-sans">
                      <li>• ربط مباشر عبر FIX API مع TradingView و cTrader</li>
                      <li>• عمولة منخفضة جداً وتنفيذ مؤسسي شفاف</li>
                      <li>• دعم فني مخصص لعملاء MBKtrading</li>
                    </ul>
                  </div>
                  <button
                    onClick={onOpenBrokerModal}
                    className="w-full py-2 px-3 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    {isAr ? 'ربط الحساب عبر cTrader' : 'Connect via cTrader'}
                  </button>
                </div>
              </div>

              {/* Copy Trading Multiplier Settings Desk */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'إعدادات مضاعف المخاطرة للنسخ الآلي (Risk Multiplier)' : 'Copy Risk Multiplier'}
                  </h3>
                  <span className="text-xs font-mono text-[#089981] font-bold">Auto Execution Ready</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-[#131722] p-3 rounded border border-[#2a2e39] space-y-1">
                    <div className="text-xs font-bold text-white">{isAr ? 'محافظ (Conservative)' : 'Conservative'}</div>
                    <div className="text-xs text-[#787b86]">1.0x Multiplier • 1% Risk / Trade</div>
                    <div className="text-[10px] text-[#089981] font-mono">Recommended for Accounts &gt; $5,000</div>
                  </div>
                  <div className="bg-[#131722] p-3 rounded border border-[#089981]/40 space-y-1">
                    <div className="text-xs font-bold text-white">{isAr ? 'معتدل (Moderate)' : 'Moderate'}</div>
                    <div className="text-xs text-[#787b86]">1.5x Multiplier • 1.5% Risk / Trade</div>
                    <div className="text-[10px] text-[#089981] font-mono">Balanced Growth Profile</div>
                  </div>
                  <div className="bg-[#131722] p-3 rounded border border-[#2a2e39] space-y-1">
                    <div className="text-xs font-bold text-white">{isAr ? 'نشط (Aggressive)' : 'Aggressive'}</div>
                    <div className="text-xs text-[#787b86]">2.0x Multiplier • 2.0% Risk / Trade</div>
                    <div className="text-[10px] text-[#f23645] font-mono">High Return / High Drawdown</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: 🤖 SMC AI AGENT & ASSISTANT */}
          {/* ======================================================== */}
          {activeTab === 'ai_agent' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Header */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-5 h-5 text-[#089981]" />
                    <h1 className="text-base font-bold text-white">
                      {isAr ? 'وكيل الذكاء الاصطناعي المؤسسي (SMC AI Agent)' : 'MBK Smart AI Agent'}
                    </h1>
                  </div>
                  <p className="text-xs text-[#787b86]">
                    {isAr
                      ? 'مساعد التحليل الفني ومفاهيم الأموال الذكية. يجيبك بلغة أرقام دقيقة حول مستويات الدخول، الـ FVG، وإدارة المخاطر.'
                      : 'Elite institutional assistant providing real-time Order Block, FVG, and session intelligence.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39] text-xs font-mono text-[#089981]">
                  gemini-3.8-flash
                </span>
              </div>

              {/* Sample Question Pills */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-[#787b86]">
                  {isAr ? 'أسئلة واستفسارات جاهزة للتنفيذ الفوري:' : 'Suggested Quick Prompts:'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    isAr ? 'ما هي مستويات السيولة على الذهب الآن؟' : 'Gold liquidity levels right now?',
                    isAr ? 'حلل صفقة النازداك (US100)' : 'Analyze US100 Nasdaq setup',
                    isAr ? 'ما هي مناطق كتل الأوامر (Order Blocks) لجلسة نيويورك؟' : 'New York Order Blocks today?',
                    isAr ? 'احسب لي حجم اللوت لحساب 10,000$ بمخاطرة 1%' : 'Lot size for $10k account at 1% risk'
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendAiPrompt(p)}
                      className="px-3 py-1 rounded-full bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] hover:border-[#363a45] text-xs text-[#d1d4dc] hover:text-white transition-all cursor-pointer text-start"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Container */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg flex flex-col h-[480px]">
                {/* Chat Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {aiMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-white text-[#131722] font-semibold'
                            : 'bg-[#131722] border border-[#2a2e39] text-[#d1d4dc]'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-[#787b86] font-mono mt-1 px-1">{msg.time}</span>
                    </div>
                  ))}

                  {aiIsTyping && (
                    <div className="flex items-center gap-2 p-3 bg-[#131722] border border-[#2a2e39] rounded-lg max-w-[220px] text-xs text-[#787b86]">
                      <span className="w-2 h-2 rounded-full bg-[#089981] animate-ping" />
                      <span>{isAr ? 'جاري تحليل هيكل السوق...' : 'Analyzing SMC order flow...'}</span>
                    </div>
                  )}
                </div>

                {/* Input Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiPrompt();
                  }}
                  className="p-3 border-t border-[#2a2e39] bg-[#131722] flex gap-2"
                >
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={isAr ? 'اسأل المحرك الذكي عن أي أصل أو خطة تداول...' : 'Ask MBK Smart AI Agent...'}
                    className="flex-1 bg-[#1e222d] border border-[#2a2e39] rounded px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-[#089981]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إرسال' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: 📓 SMART JOURNAL & SIMULATED $100K DESK */}
          {/* ======================================================== */}
          {activeTab === 'journal' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white mb-1">
                    {isAr ? 'مفكرة التداول الذكية والمحفظة التجريبية ($100K Desk)' : 'Trading Journal & $100K Paper Desk'}
                  </h1>
                  <p className="text-xs text-[#787b86]">
                    {isAr
                      ? 'تدرب بمحفظة افتراضية 100 ألف دولار مع تتبع عاداتك النفسية ومعدل التزامك بخطة إدارة رأس المال.'
                      : 'Simulate trades with a $100,000 virtual portfolio while tracking emotional discipline.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/30 text-xs font-mono font-bold" dir="ltr">
                    +$4,820.50 Profit (+4.82%)
                  </span>
                </div>
              </div>

              {/* 6.1 VIRTUAL PORTFOLIO BALANCE CARD */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3.5">
                  <div className="text-[11px] text-[#787b86] mb-1">{isAr ? 'رأس المال الابتدائي' : 'Starting Balance'}</div>
                  <div className="text-lg font-bold text-white" dir="ltr">$100,000.00</div>
                  <div className="text-[10px] text-[#787b86] mt-0.5">Demo Virtual Cash</div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3.5">
                  <div className="text-[11px] text-[#787b86] mb-1">{isAr ? 'القيمة الحالية (Equity)' : 'Equity'}</div>
                  <div className="text-lg font-bold text-[#089981]" dir="ltr">${paperEquity.toLocaleString()}</div>
                  <div className="text-[10px] text-[#089981] mt-0.5">+$4,820.50 (+4.82%)</div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3.5">
                  <div className="text-[11px] text-[#787b86] mb-1">{isAr ? 'الهامش المتاح' : 'Free Margin'}</div>
                  <div className="text-lg font-bold text-white" dir="ltr">$92,400.00</div>
                  <div className="text-[10px] text-[#787b86] mt-0.5">Margin Level: 1,240%</div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-3.5">
                  <div className="text-[11px] text-[#787b86] mb-1">{isAr ? 'معدل الانضباط' : 'Discipline Score'}</div>
                  <div className="text-lg font-bold text-[#089981]" dir="ltr">88%</div>
                  <div className="text-[10px] text-[#089981] mt-0.5">Zero revenge trades</div>
                </div>
              </div>

              {/* 6.2 ACTIVE OPEN POSITIONS ROWS */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg overflow-hidden space-y-2 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono font-bold text-[#787b86] uppercase tracking-wider">
                    {isAr ? 'الصفقات الافتراضية المفتوحة حالياً' : 'OPEN SIMULATED POSITIONS'}
                  </h3>
                  <span className="text-xs font-mono text-[#089981] font-bold" dir="ltr">
                    Floating: +$4,040.00
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs font-mono">
                    <thead className="bg-[#131722] text-[#787b86] border-b border-[#2a2e39] select-none text-[11px]">
                      <tr>
                        <th className="py-2 px-3 text-start">ASSET</th>
                        <th className="py-2 px-2 text-start">SIDE</th>
                        <th className="py-2 px-3 text-start">LOTS</th>
                        <th className="py-2 px-3 text-start">OPEN PRICE</th>
                        <th className="py-2 px-3 text-start">CURRENT</th>
                        <th className="py-2 px-3 text-start">PIPS</th>
                        <th className="py-2 px-3 text-start text-[#089981]">FLOATING P&amp;L</th>
                        <th className="py-2 px-3 text-end">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39]/60">
                      {paperPositions.map((pos) => (
                        <tr key={pos.id} className="hover:bg-[#2a2e39]/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-white">{pos.symbol}</td>
                          <td className="py-2.5 px-2">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#089981]/15 text-[#089981]">
                              {pos.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-white" dir="ltr">{pos.lots.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-white" dir="ltr">{pos.entryPrice.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-white font-bold" dir="ltr">{pos.currentPrice.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-[#089981] font-bold" dir="ltr">+{pos.pips} Pips</td>
                          <td className="py-2.5 px-3 text-[#089981] font-bold" dir="ltr">+${pos.floatingPnl.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-end">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-2.5 py-1 rounded bg-[#2a2e39] hover:bg-[#f23645]/20 hover:text-[#f23645] border border-[#363a45] text-xs font-semibold text-white transition-all cursor-pointer"
                            >
                              {isAr ? 'إغلاق الصفقة' : 'Close'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6.3 PSYCHOLOGY & HABIT DETECTIVE BANNER */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sparkles className="w-4 h-4 text-[#089981]" />
                  <span>{isAr ? 'كاشف العادات النفسية (Habit Detective AI)' : 'Psychological Habit Detective'}</span>
                </div>
                <p className="text-xs text-[#787b86] leading-relaxed">
                  {isAr
                    ? '💡 تحليل الصفقات: 88% من صفقاتك الرابحة تم الالتزام فيها بوقف الخسارة دون تحريكه أبداً. صفقاتك التي تم إغلاقها خلال جلسة لندن حققت أعلى نسبة ربح (+720 نقطة).'
                    : '💡 AI Behavioral Audit: 88% of your winning trades adhered strictly to the initial stop-loss without moving it. London sessions delivered the highest Sharpe ratio.'}
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: ⚙️ CEO & ANALYST COMMAND CENTER (PIN PROTECTED) */}
          {/* ======================================================== */}
          {activeTab === 'admin' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {!isAdminUnlocked ? (
                /* PIN Gate */
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-6 max-w-md mx-auto text-center space-y-4 my-8">
                  <div className="w-12 h-12 rounded-full bg-[#131722] border border-[#363a45] flex items-center justify-center mx-auto text-white">
                    <KeyRound className="w-6 h-6 text-[#089981]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white mb-1">
                      {isAr ? 'لوحة إدارة المنصة والمحللين (CEO Command)' : 'Platform Command Center'}
                    </h2>
                    <p className="text-xs text-[#787b86]">
                      {isAr ? 'هذه المنطقة مخصصة للإدارة لنشر التوصيات وتوليد رموز الدعوة. أدخل رمز الأمان 2026' : 'Admin & Analyst controls. Enter security PIN: 2026'}
                    </p>
                  </div>

                  <form onSubmit={handleVerifyAdminPin} className="space-y-3">
                    <input
                      type="password"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      placeholder="PIN (2026)"
                      className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-center text-sm font-mono text-white tracking-widest focus:outline-none focus:border-[#089981]"
                    />

                    {adminPinError && (
                      <div className="text-xs text-[#f23645]">
                        {isAr ? 'رمز غير صحيح! الرمز الافتراضي للإدارة هو 2026' : 'Invalid PIN! Use 2026'}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] font-bold text-xs transition-all cursor-pointer shadow-sm"
                    >
                      {isAr ? 'فتح لوحة التحكم' : 'Unlock Dashboard'}
                    </button>
                  </form>
                </div>
              ) : (
                /* Unlocked Admin Center */
                <div className="space-y-6">
                  {/* Header */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white mb-1">
                        {isAr ? 'لوحة تحكم المشرف والمحللين المعتمدين' : 'CEO & Analyst Publishing Desk'}
                      </h2>
                      <p className="text-xs text-[#787b86]">
                        {isAr ? 'نشر توصيات فورية، توليد رموز التفعيل للعملاء، وإدارة المحللين.' : 'Broadcast live signals and generate client access tokens.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAdminUnlocked(false)}
                      className="px-3 py-1 rounded bg-[#131722] border border-[#2a2e39] text-xs text-[#787b86] hover:text-white"
                    >
                      {isAr ? 'قفل اللوحة' : 'Lock'}
                    </button>
                  </div>

                  {/* Signal Publisher Form */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-[#089981]" />
                      <span>{isAr ? 'نشر توصية فورية على المنصة' : 'Broadcast Live Signal'}</span>
                    </h3>

                    {adminPublishSuccess && (
                      <div className="p-3 bg-[#089981]/15 border border-[#089981]/30 text-[#089981] rounded text-xs font-bold">
                        {isAr ? '✓ تم نشر التوصية بنجاح على شريط الإشارات الحية!' : '✓ Signal successfully broadcast to live desk!'}
                      </div>
                    )}

                    <form onSubmit={handleAdminPublishSignal} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[#787b86] block mb-1">Asset</label>
                          <select
                            value={adminSymbol}
                            onChange={(e) => setAdminSymbol(e.target.value as MarketSymbol)}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono"
                          >
                            <option value="US100">US100</option>
                            <option value="XAUUSD">XAUUSD</option>
                            <option value="EURUSD">EURUSD</option>
                            <option value="BTCUSD">BTCUSD</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[#787b86] block mb-1">Action</label>
                          <select
                            value={adminType}
                            onChange={(e) => setAdminType(e.target.value as 'BUY' | 'SELL')}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono"
                          >
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[#787b86] block mb-1">Entry Price</label>
                          <input
                            type="text"
                            value={adminEntry}
                            onChange={(e) => setAdminEntry(e.target.value)}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[#f23645] block mb-1">Stop Loss</label>
                          <input
                            type="text"
                            value={adminSl}
                            onChange={(e) => setAdminSl(e.target.value)}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[#089981] block mb-1">Take Profit 1</label>
                          <input
                            type="text"
                            value={adminTp1}
                            onChange={(e) => setAdminTp1(e.target.value)}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[#089981] block mb-1">Take Profit 2</label>
                          <input
                            type="text"
                            value={adminTp2}
                            onChange={(e) => setAdminTp2(e.target.value)}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[#787b86] block mb-1">Strategy Name</label>
                          <input
                            type="text"
                            value={adminStrategy}
                            onChange={(e) => setAdminStrategy(e.target.value)}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="py-2.5 px-4 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] font-bold transition-all cursor-pointer shadow-sm"
                      >
                        {isAr ? 'نشر التوصية الآن' : 'Publish Signal'}
                      </button>
                    </form>
                  </div>

                  {/* VIP & Trader Code Generator */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-[#089981]" />
                        <span>{isAr ? 'توليد رموز التفعيل للعملاء (VIP & Trader Codes)' : 'Invite Code Generator'}</span>
                      </h3>
                      {adminToast && (
                        <span className="text-xs font-mono text-[#089981]">{adminToast}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleGenerateCode('VIP')}
                        className="px-3 py-1.5 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer"
                      >
                        {isAr ? '+ توليد رمز VIP جديد' : '+ New VIP Code'}
                      </button>
                      <button
                        onClick={() => handleGenerateCode('TARIQ')}
                        className="px-3 py-1.5 rounded bg-[#2a2e39] hover:bg-[#363a45] text-white border border-[#363a45] text-xs font-bold transition-all cursor-pointer"
                      >
                        {isAr ? '+ رمز غرفة كابتن طارق' : '+ Tariq Room Code'}
                      </button>
                      <button
                        onClick={() => handleGenerateCode('KHALED')}
                        className="px-3 py-1.5 rounded bg-[#2a2e39] hover:bg-[#363a45] text-white border border-[#363a45] text-xs font-bold transition-all cursor-pointer"
                      >
                        {isAr ? '+ رمز غرفة أبو خالد' : '+ Khaled Room Code'}
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#2a2e39]">
                      <div className="text-[11px] font-mono text-[#787b86]">{isAr ? 'الرموز النشطة المولدة مؤخراً:' : 'Active Generated Codes:'}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {generatedCodes.map((gc, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              navigator.clipboard.writeText(gc.code);
                              setAdminToast(`Copied ${gc.code}`);
                              setTimeout(() => setAdminToast(null), 2500);
                            }}
                            className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] hover:border-[#363a45] cursor-pointer flex items-center justify-between font-mono text-xs"
                          >
                            <div>
                              <div className="font-bold text-white">{gc.code}</div>
                              <div className="text-[10px] text-[#787b86]">{gc.type}</div>
                            </div>
                            <Copy className="w-3.5 h-3.5 text-[#787b86]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* 4. UNLOCK TRADER MODAL */}
      {unlockTraderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2e39]">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#089981]" />
                <h3 className="font-bold text-white text-sm">
                  {isAr ? `تفعيل دخول غرفة ${unlockTraderModal.nameAr}` : `Unlock ${unlockTraderModal.nameEn}'s Room`}
                </h3>
              </div>
              <button
                onClick={() => setUnlockTraderModal(null)}
                className="text-[#787b86] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#787b86] leading-relaxed">
              {isAr
                ? `هذه الغرفة حصرية لمشتركي المحلل ($${unlockTraderModal.monthlyPrice}/شهرياً). إذا استلمت رمز دعوة عبر تيليجرام، أدخله هنا لتفعيل الوصول الدائم فوراً:`
                : `Enter your private subscriber invite code to gain permanent access to this analyst room:`}
            </p>

            <form onSubmit={handleUnlockTrader} className="space-y-3">
              <input
                type="text"
                value={unlockCodeInput}
                onChange={(e) => setUnlockCodeInput(e.target.value)}
                placeholder={isAr ? `مثال: ${unlockTraderModal.inviteCode}` : `e.g. ${unlockTraderModal.inviteCode}`}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#787b86] focus:outline-none focus:border-[#089981]"
              />

              {unlockCodeError && (
                <div className="text-xs text-[#f23645]">
                  {isAr ? 'رمز غير صحيح! تواصل مع المحلل أو استخدم رمز VIP2026' : 'Invalid code! Contact analyst or use VIP2026'}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  {isAr ? 'تأكيد الرمز ودخول الغرفة' : 'Confirm Code & Enter'}
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockTraderModal(null)}
                  className="px-3 py-2 rounded bg-[#131722] border border-[#2a2e39] text-xs text-[#787b86] hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
