import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import {
  UserProfile,
  MarketSymbol,
  MarketTicker,
  TradeSignal,
  ChatMessage,
  EconomicNewsItem,
  TraderProfile,
  TraderPost,
  BotState,
  BotStrategy,
  BotLogEntry,
  CopyTradingMaster,
  MBKIndicator
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
  Wallet,
  Cpu,
  Layers,
  FlaskConical,
  Brain,
  MessageSquare,
  RefreshCw,
  Compass,
  Play,
  Menu,
  Smartphone,
  Download
} from 'lucide-react';
import { TradingViewChart } from './TradingViewChart';
import { HeaderTicker } from './layout/HeaderTicker';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { PWAInstallModal } from './PWAInstallModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

// Core Sub-Components
import { MarketDesk } from './tic/MarketDesk';
import { PaperTrading } from './tic/PaperTrading';
import { SmartJournal } from './tic/SmartJournal';
import { PlaybooksLibrary } from './tic/PlaybooksLibrary';
import { BacktestLab } from './tic/BacktestLab';
import { AICoachReview } from './tic/AICoachReview';
import { CommunityChat } from './CommunityChat';
import { IndicatorsStorePanel } from './IndicatorsStorePanel';
import { CopyTradingPanel } from './CopyTradingPanel';
import { AutoBotPanel } from './AutoBotPanel';

import {
  INITIAL_BOT_STATE,
  INITIAL_BOT_LOGS,
  MASTER_TRADER_PROFILE,
  MBK_INDICATORS,
  ECONOMIC_CALENDAR_ITEMS
} from '../data/mockTradingData';

// Safe Error Boundary to prevent any blank screen
class TabErrorBoundary extends Component<{ children: ReactNode; tabName: string }, { hasError: boolean; error: string | null }> {
  constructor(props: { children: ReactNode; tabName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Tab render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-center my-6 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#f23645]/20 text-[#f23645] flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">جاري تهيئة بيانات القسم التجريبي ({this.props.tabName})</h3>
          <p className="text-xs text-[#787b86] mb-4">تم حفظ الإعدادات، انقر لإعادة تحميل القسم في وضع المحاكاة.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded bg-white text-[#131722] text-xs font-bold hover:bg-[#d1d4dc] transition-all cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  | 'signals'       // 📡 إشارات التداول الحية وسجل النتائج
  | 'desk'          // 🧭 غرفة الأسواق والجلسات العالمية (Market Desk)
  | 'paper'         // 💼 محفظة $100K الافتراضية (Paper Desk)
  | 'autobot'       // 🤖 محرك الصفقات الآلي (Pine Script Webhook Engine)
  | 'journal'       // 📓 مفكرة التداول والتحليل النفسي (Smart Journal)
  | 'playbooks'     // 📚 مكتبة استراتيجيات صناع السوق (SMC Playbooks)
  | 'backtest'      // 🧪 مختبر الباك تست والفحص (Backtest Lab)
  | 'aicoach'       // 🧠 الموجّه والمحلل الذكي (AI Coach & SMC Agent)
  | 'traders'       // 🏆 نخبة المحللين وغرف التداول (Top Analysts)
  | 'indicators'    // 🛍️ متجر المؤشرات وخوارزميات Pine (Indicators Store)
  | 'copy_trading'  // 🤝 نسخ الصفقات وربط الوسطاء (Copy Trading)
  | 'calendar'      // 📅 المفكرة الاقتصادية والبيانات (Economic Calendar)
  | 'community'     // 💬 شات المتداولين المباشر (Community Live Chat)
  | 'admin';        // ⚙️ لوحة الإدارة والتحكم (Admin Command Center)

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
      tp2: 20540.0,
      sl: 20380.0,
      pips: 60,
      status: 'TP1_HIT',
      notesAr: 'حصد 60 نقطة سريعة مع تدفق أوامر الشراء الصباحية في وول ستريت.',
      notesEn: 'Locked 60 quick points with morning Wall Street liquidity inflow.',
      timestamp: 'منذ 3 ساعات',
      likes: 27
    }
  ],
  karim_sayed: [
    {
      id: 'post-s1',
      traderId: 'karim_sayed',
      traderName: 'كريم السيد (محلل السوينغ)',
      traderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      titleAr: 'سوينغ EURUSD: ارتداد من مستوى دعم البنك المركزي',
      titleEn: 'EURUSD Swing: Rebound from ECB Macro Level',
      symbol: 'EURUSD',
      action: 'BUY',
      entryPrice: 1.0820,
      tp1: 1.0880,
      tp2: 1.0940,
      sl: 1.0780,
      pips: 60,
      status: 'ACTIVE',
      notesAr: 'صفقة مستمرة تستهدف مستويات 1.0940 مع نهاية الأسبوع.',
      notesEn: 'Multi-day setup aiming for 1.0940 liquidity target.',
      timestamp: 'منذ 4 ساعات',
      likes: 19
    }
  ]
};

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

  // Bulletproof user info with absolute safety against undefined/null
  const safeUser = user || {
    uid: 'demo_uid',
    name: 'متداول MBK المعتمد',
    email: 'trader@mbk.io',
    role: 'VIP',
    planName: 'عضوية تجريبية شاملة'
  };
  const userName = safeUser.name || (safeUser.email ? safeUser.email.split('@')[0] : 'Trader');
  const isVIP = safeUser.role === 'VIP' || safeUser.role === 'ADMIN' || safeUser.isAdmin;

  // Active Sidebar Workspace Tab (Default: Live Signals)
  const [activeTab, setActiveTab] = useState<DashboardTab>('signals');

  // Mobile Drawer and PWA Install States
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, isAndroid } = usePWAInstall();

  // Demo / Live Environment Mode Toggle
  const [envMode, setEnvMode] = useState<'DEMO' | 'LIVE_READY'>('DEMO');

  // Expanded Chart Card IDs
  const [expandedChartId, setExpandedChartId] = useState<string | null>('card-us100');

  // Copied state feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected Trader Room State (when inside Tab: traders)
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

  // SMC AI Agent Chat State (Tab: aicoach)
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

  // Automated Bot State
  const [botState, setBotState] = useState<BotState>(INITIAL_BOT_STATE);
  const [botLogs, setBotLogs] = useState<BotLogEntry[]>(INITIAL_BOT_LOGS);

  // Admin PIN Gate State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Admin Signal Publisher State
  const [adminSymbol, setAdminSymbol] = useState<MarketSymbol>('US100');
  const [adminType, setAdminType] = useState<'BUY' | 'SELL'>('BUY');
  const [adminEntry, setAdminEntry] = useState('20440.00');
  const [adminTp1, setAdminTp1] = useState('20880.00');
  const [adminTp2, setAdminTp2] = useState('20950.00');
  const [adminSl, setAdminSl] = useState('20380.00');
  const [adminStrategy, setAdminStrategy] = useState('MBK Scalp Breakout & Liquidity Sweep');
  const [adminPublishSuccess, setAdminPublishSuccess] = useState(false);

  // Admin Generated Codes List
  const [generatedCodes, setGeneratedCodes] = useState<Array<{ code: string; type: string; date: string }>>([
    { code: 'MBK2026', type: 'VIP Unlimited', date: 'دائم' },
    { code: 'VIP2026', type: 'VIP Full Access', date: 'دائم' },
    { code: 'TARIQ2026', type: 'Gold Sniper Room', date: 'دائم' },
    { code: 'KHALED2026', type: 'NY Scalp Room', date: 'دائم' }
  ]);

  // UTC Live Server Time String
  const [serverTimeUtc, setServerTimeUtc] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setServerTimeUtc(now.toISOString().substring(11, 19));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick Copy Action Helper
  const handleCopy = (text: string, id: string) => {
    soundManager.playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Handler: Send SMC AI Chat Query
  const handleSendAiPrompt = (query: string) => {
    if (!query.trim()) return;
    soundManager.playClick();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setAiMessages((prev) => [...prev, { role: 'user', text: query, time: nowTime }]);
    setAiInput('');
    setAiIsTyping(true);

    setTimeout(() => {
      setAiIsTyping(false);
      soundManager.playProfitChime();

      let reply = '';
      if (query.includes('ذهب') || query.includes('XAU') || query.toLowerCase().includes('gold')) {
        reply = isAr
          ? '【تحليل SMC للذهب XAUUSD】\n• الاتجاه العام: صعودي قوي (Bullish Order Flow).\n• مستويات السيولة: تم سحب سيولة قاع آسيا عند 2,668$.\n• منطقة الدخول المثالية: 2,672$ - 2,674$ (كتلة أوامر شرائية Bullish Order Block).\n• الأهداف: 2,684$ (+100 نقطة) ثم 2,692$.\n• وقف الخسارة: إغلاق شمعة ساعة أسفل 2,658$ يلغي الفكرة.'
          : '【XAUUSD Spot Gold SMC Analysis】\n• Structure: Bullish Order Flow with Asian Low sweep at $2,668.\n• Optimal Entry: $2,672 - $2,674 (Bullish Order Block).\n• Targets: $2,684 (+100 pips) then $2,692.\n• Stop Loss: Hourly close below $2,658 invalidates.';
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
      user: userName,
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

  // Navigation Items with Clear Grouping
  const NAV_CATEGORIES = [
    {
      id: 'trading',
      titleAr: 'التداول المباشر ومراقبة السوق',
      titleEn: 'LIVE TRADING & DESK',
      items: [
        {
          id: 'signals' as DashboardTab,
          labelAr: '📡 الإشارات الحية وسجل النتائج',
          labelEn: 'Live Signals & Audit',
          badge: '+4 LIVE',
          badgeColor: 'text-[#089981] bg-[#089981]/15'
        },
        {
          id: 'desk' as DashboardTab,
          labelAr: '🧭 غرفة الأسواق والجلسات',
          labelEn: 'Market Desk & Sessions',
          badge: '4 SESSIONS',
          badgeColor: 'text-white bg-[#2a2e39]'
        },
        {
          id: 'paper' as DashboardTab,
          labelAr: '💼 محفظة $100K الافتراضية',
          labelEn: 'Paper Trading $100K',
          badge: '$100K DEMO',
          badgeColor: 'text-[#089981] bg-[#089981]/15'
        },
        {
          id: 'autobot' as DashboardTab,
          labelAr: '🤖 محرك الصفقات الآلي',
          labelEn: 'Auto Bot & Webhook',
          badge: 'ONLINE',
          badgeColor: 'text-[#089981] bg-[#089981]/15'
        }
      ]
    },
    {
      id: 'intelligence',
      titleAr: 'استراتيجيات وأدوات SMC',
      titleEn: 'SMC INTELLIGENCE & EDGE',
      items: [
        {
          id: 'journal' as DashboardTab,
          labelAr: '📓 مفكرة التداول والتحليل النفسي',
          labelEn: 'Smart Trade Journal',
          badge: 'AUTO STATS',
          badgeColor: 'text-white bg-[#2a2e39]'
        },
        {
          id: 'playbooks' as DashboardTab,
          labelAr: '📚 مكتبة استراتيجيات صناع السوق',
          labelEn: 'SMC Playbooks Library',
          badge: '4 BUILT-IN',
          badgeColor: 'text-[#089981] bg-[#089981]/15'
        },
        {
          id: 'backtest' as DashboardTab,
          labelAr: '🧪 مختبر الباك تست والفحص',
          labelEn: 'Backtest Lab Simulator',
          badge: 'R:R MATRIX',
          badgeColor: 'text-white bg-[#2a2e39]'
        },
        {
          id: 'aicoach' as DashboardTab,
          labelAr: '🧠 الموجّه الذكي والمحلل النفسي',
          labelEn: 'AI Coach & Review',
          badge: 'BEHAVIORAL',
          badgeColor: 'text-[#089981] bg-[#089981]/15'
        }
      ]
    },
    {
      id: 'ecosystem',
      titleAr: 'المنظومة والمجتمع',
      titleEn: 'ECOSYSTEM & MARKETPLACE',
      items: [
        {
          id: 'traders' as DashboardTab,
          labelAr: '🏆 نخبة المحللين وغرف التداول',
          labelEn: 'Top Analysts Rooms',
          badge: '4 ROOMS',
          badgeColor: 'text-white bg-[#2a2e39]'
        },
        {
          id: 'indicators' as DashboardTab,
          labelAr: '🛍️ متجر المؤشرات (Pine Script)',
          labelEn: 'Indicators Store',
          badge: 'PINE V5',
          badgeColor: 'text-white bg-[#2a2e39]'
        },
        {
          id: 'copy_trading' as DashboardTab,
          labelAr: '🤝 نسخ الصفقات وربط الوسطاء',
          labelEn: 'Copy Trading Bridge',
          badge: '0.0 PIP',
          badgeColor: 'text-[#089981] bg-[#089981]/15'
        },
        {
          id: 'calendar' as DashboardTab,
          labelAr: '📅 المفكرة الاقتصادية والبيانات',
          labelEn: 'Economic Calendar',
          badge: 'HIGH IMPACT',
          badgeColor: 'text-[#f23645] bg-[#f23645]/15'
        },
        {
          id: 'community' as DashboardTab,
          labelAr: '💬 شات المتداولين المباشر',
          labelEn: 'Community Live Chat',
          badge: '280+ ONLINE',
          badgeColor: 'text-[#089981] bg-[#089981]/15'
        }
      ]
    },
    {
      id: 'administration',
      titleAr: 'الإدارة والتحكم',
      titleEn: 'ADMINISTRATION',
      items: [
        {
          id: 'admin' as DashboardTab,
          labelAr: '⚙️ لوحة الإدارة ونشر الإشارات',
          labelEn: 'Command Center',
          badge: 'PIN 2026',
          badgeColor: 'text-[#787b86] bg-[#2a2e39]'
        }
      ]
    }
  ];

  return (
    <div
      className={`h-[100dvh] min-h-[100dvh] w-full bg-[#131722] text-[#d1d4dc] flex flex-col antialiased selection:bg-[#089981]/30 selection:text-[#089981] overflow-hidden ${
        isAr ? 'font-sans' : ''
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. TOP LIVE TICKER TAPE (Zero-error TradingView style ticker) */}
      <HeaderTicker onSelectSymbol={onSelectSymbol} lang={lang} />

      {/* 2. TOP DASHBOARD NAVIGATION BAR */}
      <header className="h-14 bg-[#1e222d] border-b border-[#2a2e39] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Mobile Menu Toggle + Brand + Back to Home */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Drawer Hamburger Button */}
          <button
            onClick={() => {
              setMobileDrawerOpen(true);
              soundManager.playClick();
            }}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-white transition-colors cursor-pointer"
            title={isAr ? 'القائمة والأدوات' : 'Menu & Desks'}
          >
            <Menu className="w-4 h-4 text-[#089981]" />
            <span className="text-[11px] font-bold text-white">
              {isAr ? 'الأدوات ☰' : 'Desks ☰'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white text-[#131722] font-mono font-bold text-sm flex items-center justify-center shadow-sm shrink-0">
              MBK
            </div>
            <div className="hidden xs:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-wide">MBK DESK</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#2a2e39] text-[#089981] border border-[#089981]/30">
                  INSTITUTIONAL v3.2
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

        {/* Center: Environment Mode Badge (Demo vs Live Ready) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#131722] border border-[#2a2e39]">
          <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse" />
          <span className="text-xs font-semibold text-white">
            {isAr ? 'وضع المحاكاة الكامل (Demo Mode)' : 'Full Demo Mode Active'}
          </span>
          <span className="text-[#363a45]">|</span>
          <span className="text-[11px] text-[#787b86]">
            {isAr ? 'جميع الأدوات الـ 13 مفعلة ومتاحة للتجربة' : 'All 13 Institutional Desks Unlocked'}
          </span>
        </div>

        {/* Right: User Profile + PWA Install + Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* PWA Install Button (Quick trigger on mobile & desktop) */}
          {!isInstalled && (
            <button
              onClick={() => {
                setPwaModalOpen(true);
                soundManager.playClick();
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded bg-[#089981]/15 hover:bg-[#089981]/25 text-[#089981] border border-[#089981]/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title={isAr ? 'تثبيت التطبيق على الهاتف' : 'Install Mobile App'}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAr ? 'تثبيت التطبيق' : 'Install App'}</span>
              <span className="sm:hidden text-[10px]">{isAr ? 'تثبيت' : 'App'}</span>
            </button>
          )}

          {/* User Profile Badge (tapping opens drawer on mobile) */}
          <div
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setMobileDrawerOpen(true);
              }
            }}
            className="flex items-center gap-2 px-2 sm:px-2.5 py-1 rounded-lg bg-[#131722] border border-[#2a2e39] cursor-pointer md:cursor-default"
          >
            <div className="w-6 h-6 rounded-full bg-[#2a2e39] border border-[#363a45] flex items-center justify-center text-xs font-bold text-white uppercase">
              {userName ? userName[0] : 'U'}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                {userName}
              </div>
              <div className="flex items-center gap-1">
                {isVIP ? (
                  <span className="text-[10px] font-bold text-[#089981] flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-[#089981]" />
                    VIP MEMBER
                  </span>
                ) : (
                  <span className="text-[10px] text-[#787b86]">DEMO ACCESS</span>
                )}
              </div>
            </div>
          </div>

          {/* VIP Upgrade Button for Free Users */}
          {!isVIP && (
            <button
              onClick={onOpenPromoModal}
              className="px-2 sm:px-2.5 py-1 rounded bg-[#089981] hover:bg-[#089981]/80 text-[#131722] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAr ? 'تفعيل VIP' : 'Upgrade VIP'}</span>
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
      {/* Mobile-compact telemetry */}
      <div className="sm:hidden h-7 bg-[#0d1017] border-b border-[#2a2e39] px-3 flex items-center justify-between text-[10px] font-mono text-[#787b86] shrink-0 select-none">
        <span className="flex items-center gap-1.5 text-[#089981] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
          <span>EQX-LD4</span>
          <span className="text-white font-medium" dir="ltr">0.9ms</span>
        </span>
        <span className="text-[#363a45]">|</span>
        <span className="text-white font-bold" dir="ltr">{serverTimeUtc} UTC</span>
        <span className="text-[#363a45]">|</span>
        <span className="text-[#089981] font-bold">DEMO ACTIVE</span>
      </div>

      {/* Desktop telemetry */}
      <div className="hidden sm:flex h-7 bg-[#0d1017] border-b border-[#2a2e39] px-4 items-center justify-between text-[11px] font-mono text-[#787b86] shrink-0 overflow-x-auto whitespace-nowrap select-none">
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
            DEMO ENGINE: <strong className="text-[#089981]">ACTIVE &amp; READY FOR LIVE</strong>
          </span>
          <span className="text-[#363a45]">|</span>
          <span>
            DATA STREAM: <strong className="text-white">CME / FXCM DIRECT</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            SESSION: <strong className="text-white">LONDON / NY OVERLAP</strong>
          </span>
          <span className="text-[#363a45]">|</span>
          <span>
            SERVER TIME: <strong className="text-white" dir="ltr">{serverTimeUtc} UTC</strong>
          </span>
        </div>
      </div>

      {/* 3. MAIN TERMINAL WORKSPACE: FIXED SIDEBAR + TAB CONTENT */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden w-full">
        {/* FIXED INSTITUTIONAL SIDEBAR (Desktop) */}
        <aside className="w-68 bg-[#1e222d] border-e border-[#2a2e39] hidden md:flex flex-col justify-between shrink-0 select-none">
          <div className="p-3 space-y-4 overflow-y-auto">
            {NAV_CATEGORIES.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="px-2 text-[10px] font-mono font-bold text-[#787b86] uppercase tracking-wider">
                  {isAr ? cat.titleAr : cat.titleEn}
                </div>
                {cat.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSelectedTrader(null);
                        soundManager.playClick();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#131722] font-bold shadow-sm'
                          : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{isAr ? item.labelAr : item.labelEn}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          isActive ? 'bg-[#131722] text-white' : item.badgeColor
                        }`}
                        dir="ltr"
                      >
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Sidebar: Quick Demo Guide */}
          <div className="p-3 border-t border-[#2a2e39] bg-[#131722]/50 text-center">
            <div className="text-[11px] font-bold text-white mb-0.5">
              {isAr ? 'منصة MBK Institutional Desk' : 'MBK Institutional Desk'}
            </div>
            <div className="text-[10px] text-[#787b86]">
              {isAr ? '13 قسماً تفاعلياً جاهزة للربط الحي' : '13 Desks Ready for Live Deployment'}
            </div>
          </div>
        </aside>

        {/* MOBILE TOP TAB BAR (Horizontal Swipe Strip with active focus) */}
        <div className="md:hidden flex items-center gap-1.5 px-2.5 py-2 bg-[#1e222d] border-b border-[#2a2e39] overflow-x-auto shrink-0 select-none w-full scrollbar-none">
          {NAV_CATEGORIES.flatMap((c) => c.items).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedTrader(null);
                  soundManager.playClick();
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-white text-[#131722] font-bold shadow-sm'
                    : 'bg-[#131722] text-[#787b86] hover:text-white border border-[#2a2e39]'
                }`}
              >
                <span>{isAr ? item.labelAr.split(' ')[0] + ' ' + (item.labelAr.split(' ')[1] || '') : item.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* WORKSPACE MAIN CONTENT AREA */}
        <main className="flex-1 min-h-0 w-full overflow-y-auto bg-[#131722] relative p-3 sm:p-5 pb-28 md:pb-6 overscroll-contain">
          {/* ======================================================== */}
          {/* TAB 1: 📡 LIVE SIGNALS & AUDITED TRACK RECORD */}
          {/* ======================================================== */}
          {activeTab === 'signals' && (
            <TabErrorBoundary tabName="Live Signals">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#089981] animate-ping" />
                      <h1 className="text-base sm:text-lg font-bold text-white">
                        {isAr ? 'إشارات التداول المؤسسية الحية وسجل الأداء' : 'Live Institutional Signals Stream & Audit'}
                      </h1>
                    </div>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'بث مباشر لتوصيات المحرك الخوارزمي وفريق أبحاث MBK مع تدقيق فوري لمستويات الدخول والأهداف.'
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
                    {isAr ? 'الصفقات النشطة قيد المتابعة اللحظية' : 'ACTIVE EXECUTIONS'}
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
                            ? 'ارتداد دقيق من فجوة القيمة العادلة (FVG) على فريم الساعة مع استهداف سيولة القمة اليومية. أرباح استثنائية تفوق 164 نقطة.'
                            : 'Flawless 1H FVG rejection expanding towards buy-side liquidity above daily highs.'}
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
                            onClick={() => handleCopy('XAUUSD BUY @ 2,668 | TP1: 2,676 | TP2: 2,684.40 | SL: 2,658', 'xau')}
                            className={`py-1.5 px-4 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              copiedId === 'xau' ? 'bg-[#089981] text-[#131722]' : 'bg-white text-[#131722] hover:bg-[#d1d4dc]'
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === 'xau' ? (isAr ? '✓ تم النسخ' : 'Copied!') : (isAr ? 'نسخ التوصية' : 'Copy')}</span>
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

                {/* 1.2 VERIFIED PERFORMANCE AUDIT LOG TABLE & MONTHLY SUMMARIES */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2e39]">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#089981]" />
                        <span>{isAr ? 'سجل الأداء والصفقات الموثق (Audited Track Record)' : 'Audited Track Record & Logs'}</span>
                      </h2>
                      <p className="text-xs text-[#787b86]">
                        {isAr
                          ? 'جميع الصفقات مدققة مع حساب النقاط الصافية ومعدل العائد للمخاطرة 1:2.4+'
                          : 'Full audit of recent executions with net pips and risk/reward verification.'}
                      </p>
                    </div>

                    {/* Monthly Performance Summary Cards */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <div className="px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39]">
                        <span className="text-[#787b86] me-1">Jan:</span>
                        <span className="text-[#089981] font-bold" dir="ltr">+410 Pips</span>
                      </div>
                      <div className="px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39]">
                        <span className="text-[#787b86] me-1">Feb:</span>
                        <span className="text-[#089981] font-bold" dir="ltr">+390 Pips</span>
                      </div>
                      <div className="px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39]">
                        <span className="text-[#787b86] me-1">Mar:</span>
                        <span className="text-[#089981] font-bold" dir="ltr">+620 Pips</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left rtl:text-right">
                      <thead className="text-[11px] font-mono text-[#787b86] bg-[#131722] border-b border-[#2a2e39]">
                        <tr>
                          <th className="py-2.5 px-3">SYMBOL</th>
                          <th className="py-2.5 px-3">TYPE</th>
                          <th className="py-2.5 px-3">ENTRY</th>
                          <th className="py-2.5 px-3">TARGET</th>
                          <th className="py-2.5 px-3">SL</th>
                          <th className="py-2.5 px-3">NET RESULT</th>
                          <th className="py-2.5 px-3">R:R</th>
                          <th className="py-2.5 px-3">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2e39]/50 font-mono">
                        <tr className="hover:bg-[#131722]/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">US100</td>
                          <td className="py-3 px-3 text-[#089981] font-bold">BUY</td>
                          <td className="py-3 px-3 text-white" dir="ltr">20,440.00</td>
                          <td className="py-3 px-3 text-[#089981]" dir="ltr">20,950.00</td>
                          <td className="py-3 px-3 text-[#f23645]" dir="ltr">20,380.00</td>
                          <td className="py-3 px-3 text-[#089981] font-bold" dir="ltr">+120 Pips</td>
                          <td className="py-3 px-3 text-white" dir="ltr">1 : 2.4</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-[#089981]/20 text-[#089981] text-[10px] font-bold">
                              TP2 HIT
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-[#131722]/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">XAUUSD</td>
                          <td className="py-3 px-3 text-[#089981] font-bold">BUY</td>
                          <td className="py-3 px-3 text-white" dir="ltr">2,668.00</td>
                          <td className="py-3 px-3 text-[#089981]" dir="ltr">2,684.40</td>
                          <td className="py-3 px-3 text-[#f23645]" dir="ltr">2,658.00</td>
                          <td className="py-3 px-3 text-[#089981] font-bold" dir="ltr">+164 Pips</td>
                          <td className="py-3 px-3 text-white" dir="ltr">1 : 2.5</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-[#089981]/20 text-[#089981] text-[10px] font-bold">
                              ALL TARGETS
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-[#131722]/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">EURUSD</td>
                          <td className="py-3 px-3 text-[#089981] font-bold">BUY</td>
                          <td className="py-3 px-3 text-white" dir="ltr">1.0840</td>
                          <td className="py-3 px-3 text-[#089981]" dir="ltr">1.0873</td>
                          <td className="py-3 px-3 text-[#f23645]" dir="ltr">1.0825</td>
                          <td className="py-3 px-3 text-[#089981] font-bold" dir="ltr">+33 Pips</td>
                          <td className="py-3 px-3 text-white" dir="ltr">1 : 2.2</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-[#089981]/20 text-[#089981] text-[10px] font-bold">
                              TP1 HIT
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-[#131722]/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">BTCUSD</td>
                          <td className="py-3 px-3 text-[#089981] font-bold">BUY</td>
                          <td className="py-3 px-3 text-white" dir="ltr">66,200</td>
                          <td className="py-3 px-3 text-[#089981]" dir="ltr">68,000</td>
                          <td className="py-3 px-3 text-[#f23645]" dir="ltr">65,400</td>
                          <td className="py-3 px-3 text-[#089981] font-bold" dir="ltr">+180 Pips</td>
                          <td className="py-3 px-3 text-white" dir="ltr">1 : 2.3</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-[#089981]/20 text-[#089981] text-[10px] font-bold">
                              TP2 HIT
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 2: 🧭 MARKET DESK & GLOBAL SESSIONS */}
          {/* ======================================================== */}
          {activeTab === 'desk' && (
            <TabErrorBoundary tabName="Market Desk">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Compass className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'غرفة تداول الأسواق وجلسات التداول العالمية' : 'Global Market Desk & Sessions'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'مراقبة حية لساعات افتتاح وإغلاق بورصات سيدني، طوكيو، لندن، ونيويورك مع مؤشر السيولة ومقياس قوة العملات.'
                        : 'Real-time session clocks, liquidity overlap windows, and currency strength matrix.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#131722] border border-[#2a2e39] font-mono text-xs text-[#089981] font-bold self-start sm:self-auto" dir="ltr">
                    4 SESSIONS ONLINE
                  </span>
                </div>

                {/* Render MarketDesk Component */}
                <MarketDesk tickers={tickers} onSelectSymbol={onSelectSymbol} />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 3: 💼 $100K PAPER TRADING TERMINAL */}
          {/* ======================================================== */}
          {activeTab === 'paper' && (
            <TabErrorBoundary tabName="Paper Trading">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'محفظة التداول الافتراضية ($100K Paper Trading Desk)' : 'Paper Trading Terminal ($100K Desk)'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'تداول تجريبي واقعي بأسعار السوق المباشرة، تنفيذ أوامر الشراء والبيع، إدارة وقف الخسارة وجني الأرباح.'
                        : 'Simulate trades with live market order flow, custom lot sizing, and risk parameters.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/30 font-mono text-xs font-bold self-start sm:self-auto" dir="ltr">
                    $100,000 VIRTUAL BALANCE
                  </span>
                </div>

                {/* Render PaperTrading Component */}
                <PaperTrading
                  tickers={tickers}
                  selectedSymbol={selectedSymbol}
                  onSelectSymbol={onSelectSymbol}
                />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 4: 🤖 AUTO BOT & PINE SCRIPT WEBHOOK ENGINE */}
          {/* ======================================================== */}
          {activeTab === 'autobot' && (
            <TabErrorBoundary tabName="Auto Bot">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'محرك الصفقات الآلي وخوارزمية Webhook المباشرة' : 'Automated Bot & Pine Script Webhook'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'استقبال إشارات TradingView Pine Script عبر Webhook آمن وتنفيذ الصفقات تلقائياً مع حماية وقف الخسارة المتحرك.'
                        : 'Execute TradingView alerts with zero latency, automated trailing stops, and multi-broker routing.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/30 font-mono text-xs font-bold self-start sm:self-auto" dir="ltr">
                    WEBHOOK ACTIVE
                  </span>
                </div>

                {/* Render AutoBotPanel */}
                <AutoBotPanel
                  botState={botState}
                  botLogs={botLogs}
                  onToggleBot={() => {
                    soundManager.playClick();
                    setBotState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
                  }}
                  onUpdateStrategy={(strat: BotStrategy) => {
                    soundManager.playClick();
                    setBotState((prev) => ({ ...prev, activeStrategy: strat }));
                  }}
                  onUpdateRisk={(risk: number) => {
                    setBotState((prev) => ({ ...prev, riskPerTrade: risk }));
                  }}
                  onUpdateLimit={(limit: number) => {
                    setBotState((prev) => ({ ...prev, dailyTradesLimit: limit }));
                  }}
                  onClearLogs={() => setBotLogs([])}
                />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 5: 📓 SMART JOURNAL & PSYCHOLOGICAL AUDIT */}
          {/* ======================================================== */}
          {activeTab === 'journal' && (
            <TabErrorBoundary tabName="Smart Journal">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'مفكرة التداول الذكية ومحلل الانضباط النفسي' : 'Smart Trade Journal & Behavioral Discipline'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'توثيق كل صفقة مع لقطات الشارت، تصنيف المشاعر (FOMO، انتقام، انضباط)، وحساب نسبة العائد للمخاطرة R:R تلقائياً.'
                        : 'Audit trade executions, emotional discipline, mistakes tagging, and cumulative R-multiple curve.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#131722] border border-[#2a2e39] font-mono text-xs text-[#089981] font-bold self-start sm:self-auto" dir="ltr">
                    AUTO R:R CALCULATOR
                  </span>
                </div>

                {/* Render SmartJournal Component */}
                <SmartJournal />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 6: 📚 SMC PLAYBOOKS LIBRARY */}
          {/* ======================================================== */}
          {activeTab === 'playbooks' && (
            <TabErrorBoundary tabName="SMC Playbooks">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'مكتبة استراتيجيات صناع السوق المعتمدة (SMC Playbooks)' : 'Institutional SMC Playbooks Library'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'نماذج سحب السيولة (Asian Sweep + MSS)، الرصاصة الفضية (ICT Silver Bullet)، كتل الأوامر (Order Blocks)، وفجوات القيمة العادلة (FVG) مع قوائم فحص تفاعلية.'
                        : 'Systematized institutional execution playbooks with interactive pre-trade checklists and rules.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#131722] border border-[#2a2e39] font-mono text-xs text-[#089981] font-bold self-start sm:self-auto" dir="ltr">
                    4 VERIFIED PLAYBOOKS
                  </span>
                </div>

                {/* Render PlaybooksLibrary Component */}
                <PlaybooksLibrary />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 7: 🧪 BACKTEST LAB SIMULATOR */}
          {/* ======================================================== */}
          {activeTab === 'backtest' && (
            <TabErrorBoundary tabName="Backtest Lab">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'مختبر الفحص التاريخي ومحاكي الاستراتيجيات (Backtest Lab)' : 'Backtest Lab & Strategy Simulator'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'اختبر استراتيجياتك على البيانات التاريخية، احسب نسبة الفوز ومضاعف R المتوقع، وشاهد منحنى نمو الحساب.'
                        : 'Simulate historical setups, log R-multiples, and verify system expectancy.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#131722] border border-[#2a2e39] font-mono text-xs text-[#089981] font-bold self-start sm:self-auto" dir="ltr">
                    QUANT LAB READY
                  </span>
                </div>

                {/* Render BacktestLab Component */}
                <BacktestLab />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 8: 🧠 AI COACH & BEHAVIORAL REVIEW */}
          {/* ======================================================== */}
          {activeTab === 'aicoach' && (
            <TabErrorBoundary tabName="AI Coach">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Brain className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'الموجّه الذكي ومحلل السيولة اللحظي (SMC AI Assistant)' : 'Behavioral AI Coach & SMC Intelligence'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'استشر الذكاء الاصطناعي المؤسسي لرصد فجوات FVG، كتل الأوامر، وحساب اللوت المناسب لكل صفقة.'
                        : 'Consult institutional AI on order flow, liquidity imbalances, and disciplined risk execution.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/30 font-mono text-xs font-bold self-start sm:self-auto" dir="ltr">
                    SMC AI ACTIVE
                  </span>
                </div>

                {/* Interactive AI Chat Box with Sample Questions */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col h-[480px]">
                  {/* Chat Messages Log */}
                  <div className="flex-1 overflow-y-auto space-y-3 p-2">
                    {aiMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'model' && (
                          <div className="w-7 h-7 rounded bg-[#131722] border border-[#2a2e39] flex items-center justify-center text-[#089981] shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded p-3 text-xs leading-relaxed whitespace-pre-line ${
                            msg.role === 'user'
                              ? 'bg-white text-[#131722] font-semibold'
                              : 'bg-[#131722] text-[#d1d4dc] border border-[#2a2e39]'
                          }`}
                        >
                          <div className="text-[10px] text-[#787b86] mb-1 font-mono">{msg.time}</div>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {aiIsTyping && (
                      <div className="flex items-center gap-2 text-xs text-[#089981] font-mono p-2">
                        <span className="w-2 h-2 rounded-full bg-[#089981] animate-ping" />
                        <span>{isAr ? 'جاري فحص سيولة السوق وكتل الأوامر...' : 'Scanning order flow and liquidity pools...'}</span>
                      </div>
                    )}
                  </div>

                  {/* Sample Query Quick Action Pills */}
                  <div className="pt-2 border-t border-[#2a2e39] flex items-center gap-1.5 overflow-x-auto pb-2 shrink-0">
                    <span className="text-[10px] text-[#787b86] shrink-0 font-mono">
                      {isAr ? 'أسئلة مقترحة:' : 'Quick Prompts:'}
                    </span>
                    <button
                      onClick={() => handleSendAiPrompt(isAr ? 'ما هي مستويات السيولة على الذهب الآن؟' : 'Analyze Gold liquidity levels')}
                      className="px-2.5 py-1 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[11px] text-[#d1d4dc] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isAr ? '💰 سيولة الذهب الآن' : 'Gold Liquidity'}
                    </button>
                    <button
                      onClick={() => handleSendAiPrompt(isAr ? 'حلل صفقة النازداك ومناطق FVG' : 'Analyze Nasdaq FVG')}
                      className="px-2.5 py-1 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[11px] text-[#d1d4dc] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isAr ? '📈 تحليل ناسداك وFVG' : 'Nasdaq FVG'}
                    </button>
                    <button
                      onClick={() => handleSendAiPrompt(isAr ? 'احسب لي حجم اللوت لحساب 10,000$ بمخاطرة 1%' : 'Calculate 1% risk for $10,000')}
                      className="px-2.5 py-1 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[11px] text-[#d1d4dc] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isAr ? '🧮 حاسبة اللوت 1%' : '1% Risk Calc'}
                    </button>
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAiPrompt(aiInput);
                    }}
                    className="flex gap-2 pt-2 border-t border-[#2a2e39]"
                  >
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder={isAr ? 'اكتب استفسارك للذكاء الاصطناعي (مثل: هل الدخول الآن مناسب؟)...' : 'Ask AI Agent about order flow or liquidity...'}
                      className="flex-1 bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-xs text-white placeholder-[#787b86] focus:border-[#089981] outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إرسال' : 'Send'}</span>
                    </button>
                  </form>
                </div>

                {/* Deep Behavioral Audit Component */}
                <AICoachReview activeSymbol={selectedSymbol} tickers={tickers} onSelectSymbol={onSelectSymbol} />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 9: 🏆 TOP ANALYSTS MARKETPLACE & PRIVATE ROOMS */}
          {/* ======================================================== */}
          {activeTab === 'traders' && (
            <TabErrorBoundary tabName="Top Analysts">
              <div className="max-w-7xl mx-auto space-y-6">
                {!selectedTrader ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4">
                      <div>
                        <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                          <Users className="w-5 h-5 text-white" />
                          <span>{isAr ? 'نخبة المحللين وغرف التداول الخاصة' : 'Top Verified Analysts & Private Rooms'}</span>
                        </h1>
                        <p className="text-xs text-[#787b86]">
                          {isAr
                            ? 'تابع المحرك الآلي الرسمي والمحللين الشركاء المعتمدين مع إمكانية الدخول للغرفة الخاصة برمز الدعوة.'
                            : 'Follow verified quantitative engines and partner analysts with private trading rooms.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded bg-[#131722] border border-[#2a2e39] font-mono text-xs text-[#089981] font-bold" dir="ltr">
                          4 VERIFIED ROOMS
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {INITIAL_TRADERS.map((trader) => {
                        const isUnlocked = unlockedTraderIds.includes(trader.id);
                        return (
                          <div
                            key={trader.id}
                            className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-5 flex flex-col justify-between hover:border-[#363a45] transition-all"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={trader.avatar}
                                    alt={trader.nameAr}
                                    className="w-12 h-12 rounded-lg object-cover border border-[#2a2e39]"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h3 className="text-sm font-bold text-white">
                                        {isAr ? trader.nameAr : trader.nameEn}
                                      </h3>
                                      {trader.isOfficial && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                                          OFFICIAL
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#787b86] mt-0.5">
                                      {isAr ? trader.specialtyAr : trader.specialtyEn}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-xs font-mono font-bold text-[#089981]" dir="ltr">
                                    +{trader.verifiedPipsMonth} Pips
                                  </div>
                                  <div className="text-[10px] text-[#787b86] font-mono" dir="ltr">
                                    {trader.winRate}% Win
                                  </div>
                                </div>
                              </div>

                              <p className="text-xs text-[#787b86] leading-relaxed mb-4">
                                {isAr ? trader.descriptionAr : trader.descriptionEn}
                              </p>

                              <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-center">
                                <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                                  <div className="text-[10px] text-[#787b86]">SIGNALS</div>
                                  <div className="text-xs font-bold text-white" dir="ltr">{trader.signalsCount}</div>
                                </div>
                                <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                                  <div className="text-[10px] text-[#787b86]">SUBSCRIBERS</div>
                                  <div className="text-xs font-bold text-white" dir="ltr">{trader.subscribersCount}</div>
                                </div>
                                <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                                  <div className="text-[10px] text-[#787b86]">INVITE CODE</div>
                                  <div className="text-xs font-bold text-[#089981]" dir="ltr">{trader.inviteCode}</div>
                                </div>
                              </div>
                            </div>

                            <div>
                              {isUnlocked ? (
                                <button
                                  onClick={() => {
                                    soundManager.playClick();
                                    setSelectedTrader(trader);
                                  }}
                                  className="w-full py-2 px-3 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <Unlock className="w-3.5 h-3.5 text-[#089981]" />
                                  <span>{isAr ? 'دخول غرفة التداول المباشرة' : 'Enter Live Trading Room'}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    soundManager.playClick();
                                    setUnlockTraderModal(trader);
                                    setUnlockCodeInput(trader.inviteCode);
                                    setUnlockCodeError(false);
                                  }}
                                  className="w-full py-2 px-3 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Lock className="w-3.5 h-3.5 text-[#787b86]" />
                                  <span>{isAr ? `تفعيل برمز الدعوة (${trader.inviteCode})` : 'Unlock with Invite Code'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Single Trader Live Room View */
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedTrader(null)}
                          className="p-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        </button>
                        <img
                          src={selectedTrader.avatar}
                          alt={selectedTrader.nameAr}
                          className="w-10 h-10 rounded-lg object-cover border border-[#2a2e39]"
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
                          <p className="text-xs text-[#787b86]">
                            {isAr ? selectedTrader.specialtyAr : selectedTrader.specialtyEn}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39] text-[#089981] font-bold" dir="ltr">
                          +{selectedTrader.verifiedPipsMonth} Pips
                        </span>
                        <span className="px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39] text-white" dir="ltr">
                          {selectedTrader.winRate}% Win
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Left 2 Cols: Posts Feed + Chart */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="h-80 w-full rounded overflow-hidden border border-[#2a2e39]">
                          <TradingViewChart
                            symbol={(selectedTrader.specialties[0] as MarketSymbol) || 'US100'}
                            onSymbolChange={onSelectSymbol}
                            tickers={tickers}
                          />
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-xs font-mono font-bold text-[#787b86] uppercase">
                            {isAr ? 'آخر تحليلات وتوصيات المحلل' : 'ANALYST POSTS & SIGNALS'}
                          </h3>
                          {(TRADER_POSTS_DATA[selectedTrader.id] || []).map((post) => (
                            <div key={post.id} className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#089981]/20 text-[#089981]">
                                    {post.action}
                                  </span>
                                  <span className="text-sm font-bold text-white font-mono">{post.symbol}</span>
                                </div>
                                <span className="text-[11px] text-[#787b86]">{post.timestamp}</span>
                              </div>
                              <h4 className="text-sm font-bold text-white">
                                {isAr ? post.titleAr : post.titleEn}
                              </h4>
                              <p className="text-xs text-[#787b86] leading-relaxed">
                                {isAr ? post.notesAr : post.notesEn}
                              </p>
                              <div className="grid grid-cols-4 gap-2 font-mono text-center text-xs">
                                <div className="bg-[#131722] p-1.5 rounded border border-[#2a2e39]">
                                  <div className="text-[9px] text-[#787b86]">ENTRY</div>
                                  <div className="font-bold text-white" dir="ltr">{post.entryPrice}</div>
                                </div>
                                <div className="bg-[#131722] p-1.5 rounded border border-[#2a2e39]">
                                  <div className="text-[9px] text-[#f23645]">SL</div>
                                  <div className="font-bold text-[#f23645]" dir="ltr">{post.sl}</div>
                                </div>
                                <div className="bg-[#131722] p-1.5 rounded border border-[#2a2e39]">
                                  <div className="text-[9px] text-[#089981]">TP1</div>
                                  <div className="font-bold text-[#089981]" dir="ltr">{post.tp1}</div>
                                </div>
                                <div className="bg-[#131722] p-1.5 rounded border border-[#2a2e39]">
                                  <div className="text-[9px] text-[#089981]">TP2</div>
                                  <div className="font-bold text-[#089981]" dir="ltr">{post.tp2}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Col: Private Room Live Member Discussion */}
                      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col h-[580px]">
                        <div className="pb-3 border-b border-[#2a2e39] mb-3">
                          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-[#089981]" />
                            <span>{isAr ? 'شات المشتركين والمحلل المباشر' : 'Private Room Live Chat'}</span>
                          </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 p-1">
                          {traderRoomMessages.map((m) => (
                            <div key={m.id} className="p-2.5 rounded bg-[#131722] border border-[#2a2e39] space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-white flex items-center gap-1">
                                  {m.user}
                                  {m.isAnalyst && (
                                    <span className="px-1 py-0.2 rounded bg-[#089981]/20 text-[#089981] text-[9px]">
                                      ANALYST
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-[#787b86] font-mono">{m.time}</span>
                              </div>
                              <p className="text-xs text-[#d1d4dc] leading-relaxed">{m.text}</p>
                            </div>
                          ))}
                        </div>

                        <form onSubmit={handleSendTraderMessage} className="pt-3 border-t border-[#2a2e39] flex gap-2">
                          <input
                            type="text"
                            value={traderChatInput}
                            onChange={(e) => setTraderChatInput(e.target.value)}
                            placeholder={isAr ? 'اكتب للمحلل في الغرفة...' : 'Type a message...'}
                            className="flex-1 bg-[#131722] border border-[#2a2e39] rounded px-3 py-1.5 text-xs text-white placeholder-[#787b86] focus:border-[#089981] outline-none"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded bg-white text-[#131722] text-xs font-bold hover:bg-[#d1d4dc] transition-all cursor-pointer shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 10: 🛍️ INDICATORS STORE (PINE SCRIPT V5) */}
          {/* ======================================================== */}
          {activeTab === 'indicators' && (
            <TabErrorBoundary tabName="Indicators Store">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-white" />
                      <span>{isAr ? 'متجر مؤشرات وخوارزميات Pine Script v5 الحصرية' : 'Proprietary Pine Script v5 Indicators Store'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'خوارزميات برمجية حصرية طورها فريق أبحاث MBK لفلترة الضوضاء واصطياد السيولة الصفرية على TradingView.'
                        : 'Institutional TradingView algorithms with instant demo activation for your account.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#131722] border border-[#2a2e39] font-mono text-xs text-[#089981] font-bold self-start sm:self-auto" dir="ltr">
                    TRADINGVIEW INVITE-ONLY
                  </span>
                </div>

                {/* Render IndicatorsStorePanel Component */}
                <IndicatorsStorePanel
                  indicators={MBK_INDICATORS}
                  onOpenBrokerModal={onOpenBrokerModal}
                />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 11: 🤝 COPY TRADING & BROKER BRIDGE */}
          {/* ======================================================== */}
          {activeTab === 'copy_trading' && (
            <TabErrorBoundary tabName="Copy Trading">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-white" />
                      <span>{isAr ? 'خدمة نسخ الصفقات المباشرة وربط حسابات الوسطاء' : 'Live Institutional Copy Trading Bridge'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'اربط حسابك في MT4 / MT5 أو cTrader لنسخ صفقات المحرك المعتمد تلقائياً بنفس اللحظة بفارق سبريد صفر نقطة.'
                        : 'Sync your MT4/MT5 accounts to copy institutional master signals with zero latency.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/30 font-mono text-xs font-bold self-start sm:self-auto" dir="ltr">
                    ECN 0.0 PIP BRIDGE
                  </span>
                </div>

                {/* Render CopyTradingPanel Component */}
                <CopyTradingPanel
                  masterProfile={MASTER_TRADER_PROFILE}
                  onOpenBrokerModal={onOpenBrokerModal}
                />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 12: 📅 ECONOMIC CALENDAR & MACRO NEWS */}
          {/* ======================================================== */}
          {activeTab === 'calendar' && (
            <TabErrorBoundary tabName="Economic Calendar">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'المفكرة الاقتصادية وأخبار السياسة النقدية الكبرى' : 'Economic News & High-Impact Macro Events'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'متابعة مباشرة لقرارات الفائدة الفيدرالية، أرقام التضخم CPI، وبيانات التوظيف NFP مع مؤشرات التأثير على الذهب والنازداك.'
                        : 'Real-time macro calendar tracking FOMC rate decisions, US CPI inflation, and NFP payrolls.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30 font-mono text-xs font-bold self-start sm:self-auto" dir="ltr">
                    HIGH VOLATILITY RADAR
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ECONOMIC_CALENDAR_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 space-y-3 hover:border-[#363a45] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono text-xs">{item.currency}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.impact === 'HIGH'
                                ? 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30'
                                : 'bg-[#089981]/20 text-[#089981] border border-[#089981]/30'
                            }`}
                          >
                            {item.impact} IMPACT
                          </span>
                        </div>
                        <span className="text-[11px] text-[#787b86] font-mono">{item.timeAr}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white">{item.titleAr}</h3>
                      <p className="text-xs text-[#787b86] leading-relaxed">{item.country}</p>

                      <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs pt-2 border-t border-[#2a2e39]">
                        <div className="bg-[#131722] p-1.5 rounded border border-[#2a2e39]">
                          <div className="text-[9px] text-[#787b86]">ACTUAL</div>
                          <div className="font-bold text-white" dir="ltr">{item.actual || 'قيد الانتظار'}</div>
                        </div>
                        <div className="bg-[#131722] p-1.5 rounded border border-[#2a2e39]">
                          <div className="text-[9px] text-[#787b86]">FORECAST</div>
                          <div className="font-bold text-[#089981]" dir="ltr">{item.forecast}</div>
                        </div>
                        <div className="bg-[#131722] p-1.5 rounded border border-[#2a2e39]">
                          <div className="text-[9px] text-[#787b86]">PREVIOUS</div>
                          <div className="font-bold text-[#787b86]" dir="ltr">{item.previous}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 13: 💬 COMMUNITY LIVE CHAT */}
          {/* ======================================================== */}
          {activeTab === 'community' && (
            <TabErrorBoundary tabName="Community Chat">
              <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'شات مجتمع المتداولين المباشر (284+ متداول نشط)' : 'Institutional Community Chat (284+ Online)'}</span>
                    </h1>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'نقاشات تحليلية فورية بين نخبة المتداولين، تبادل صفقات السكالبينج، وتحديثات افتتاح الأسواق العالمية.'
                        : 'Connect with disciplined quantitative and discretionary institutional traders.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/30 font-mono text-xs font-bold self-start sm:self-auto" dir="ltr">
                    LIVE ROOM ACTIVE
                  </span>
                </div>

                {/* Render CommunityChat Component */}
                <CommunityChat
                  messages={chatMessages}
                  onSendMessage={onSendMessage}
                  onLikeMessage={onLikeMessage}
                />
              </div>
            </TabErrorBoundary>
          )}

          {/* ======================================================== */}
          {/* TAB 14: ⚙️ CEO & ADMIN COMMAND CENTER */}
          {/* ======================================================== */}
          {activeTab === 'admin' && (
            <TabErrorBoundary tabName="Admin Center">
              <div className="max-w-7xl mx-auto space-y-6">
                {!isAdminUnlocked ? (
                  /* Admin PIN Form */
                  <div className="max-w-md mx-auto bg-[#1e222d] border border-[#2a2e39] rounded-lg p-6 text-center space-y-4 my-10">
                    <div className="w-12 h-12 rounded-lg bg-white text-[#131722] flex items-center justify-center mx-auto shadow-sm">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {isAr ? 'مركز قيادة المنصة (CEO Command Center)' : 'Command Center Access'}
                      </h2>
                      <p className="text-xs text-[#787b86] mt-1">
                        {isAr ? 'أدخل رمز الحماية (PIN: 2026) لفتح أدوات نشر الصفقات وإصدار الرموز' : 'Enter security PIN: 2026 for management controls'}
                      </p>
                    </div>

                    <form onSubmit={handleVerifyAdminPin} className="space-y-3">
                      <input
                        type="password"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        placeholder="PIN: 2026"
                        className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-center text-sm font-mono text-white tracking-widest outline-none focus:border-[#089981]"
                      />
                      {adminPinError && (
                        <p className="text-xs text-[#f23645]">
                          {isAr ? 'رمز الحماية غير صحيح. الرمز التجريبي هو 2026.' : 'Invalid PIN. Demo PIN is 2026.'}
                        </p>
                      )}
                      <button
                        type="submit"
                        className="w-full py-2 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        {isAr ? 'فتح لوحة التحكم' : 'Unlock Dashboard'}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Admin Center Full Controls */
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1e222d] border border-[#2a2e39] rounded-lg p-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#089981] animate-ping" />
                          <h1 className="text-base sm:text-lg font-bold text-white">
                            {isAr ? 'مركز إدارة المنصة ونشر التوصيات (Admin Command)' : 'Platform Command Center'}
                          </h1>
                        </div>
                        <p className="text-xs text-[#787b86]">
                          {isAr
                            ? 'نشر توصيات حية، توليد رموز تفعيل VIP، وإدارة صلاحيات المحللين الشركاء.'
                            : 'Publish live trade signals, generate VIP codes, and manage institutional settings.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsAdminUnlocked(false)}
                          className="px-3 py-1.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          {isAr ? 'قفل الإدارة' : 'Lock Center'}
                        </button>
                      </div>
                    </div>

                    {adminToast && (
                      <div className="p-3 rounded bg-[#089981]/20 border border-[#089981]/40 text-[#089981] text-xs font-mono font-bold text-center">
                        {adminToast}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Form: Post New Signal */}
                      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
                          <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Plus className="w-4 h-4 text-[#089981]" />
                            <span>{isAr ? 'نشر توصية تداول فورية إلى البث الحي' : 'Publish Live Signal to Stream'}</span>
                          </h2>
                          <span className="text-[10px] font-mono text-[#089981] font-bold">INSTANT BROADCAST</span>
                        </div>

                        {adminPublishSuccess && (
                          <div className="p-2.5 rounded bg-[#089981]/20 border border-[#089981]/40 text-[#089981] text-xs font-bold text-center">
                            ✓ {isAr ? 'تم نشر الصفقة بنجاح إلى شريط الإشارات الحية!' : 'Signal broadcasted successfully!'}
                          </div>
                        )}

                        <form onSubmit={handleAdminPublishSignal} className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[#787b86] mb-1">الرمز (Symbol)</label>
                              <select
                                value={adminSymbol}
                                onChange={(e) => setAdminSymbol(e.target.value as MarketSymbol)}
                                className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono outline-none"
                              >
                                <option value="US100">US100 (Nasdaq)</option>
                                <option value="XAUUSD">XAUUSD (Gold)</option>
                                <option value="EURUSD">EURUSD (Forex)</option>
                                <option value="BTCUSD">BTCUSD (Crypto)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[#787b86] mb-1">نوع الصفقة (Type)</label>
                              <select
                                value={adminType}
                                onChange={(e) => setAdminType(e.target.value as 'BUY' | 'SELL')}
                                className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white font-mono outline-none"
                              >
                                <option value="BUY">BUY (شراء)</option>
                                <option value="SELL">SELL (بيع)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 font-mono">
                            <div>
                              <label className="block text-[#787b86] text-[10px] mb-1">ENTRY</label>
                              <input
                                type="text"
                                value={adminEntry}
                                onChange={(e) => setAdminEntry(e.target.value)}
                                className="w-full bg-[#131722] border border-[#2a2e39] rounded p-1.5 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[#f23645] text-[10px] mb-1">SL</label>
                              <input
                                type="text"
                                value={adminSl}
                                onChange={(e) => setAdminSl(e.target.value)}
                                className="w-full bg-[#131722] border border-[#2a2e39] rounded p-1.5 text-[#f23645]"
                              />
                            </div>
                            <div>
                              <label className="block text-[#089981] text-[10px] mb-1">TP1</label>
                              <input
                                type="text"
                                value={adminTp1}
                                onChange={(e) => setAdminTp1(e.target.value)}
                                className="w-full bg-[#131722] border border-[#2a2e39] rounded p-1.5 text-[#089981]"
                              />
                            </div>
                            <div>
                              <label className="block text-[#089981] text-[10px] mb-1">TP2</label>
                              <input
                                type="text"
                                value={adminTp2}
                                onChange={(e) => setAdminTp2(e.target.value)}
                                className="w-full bg-[#131722] border border-[#2a2e39] rounded p-1.5 text-[#089981]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[#787b86] mb-1">اسم الاستراتيجية (Strategy Name)</label>
                            <input
                              type="text"
                              value={adminStrategy}
                              onChange={(e) => setAdminStrategy(e.target.value)}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded p-2 text-white"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            {isAr ? 'نشر التوصية الآن إلى المشتركين' : 'Broadcast Signal Now'}
                          </button>
                        </form>
                      </div>

                      {/* VIP Code Generator & List */}
                      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
                          <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Crown className="w-4 h-4 text-[#089981]" />
                            <span>{isAr ? 'توليد رموز تفعيل VIP ودعوات المحللين' : 'Generate VIP & Invite Codes'}</span>
                          </h2>
                          <span className="text-[10px] font-mono text-[#787b86]">CLICK TO GENERATE</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleGenerateCode('VIP')}
                            className="py-2 px-3 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#089981]" />
                            <span>+ توليد رمز VIP جديد</span>
                          </button>
                          <button
                            onClick={() => handleGenerateCode('ROOM')}
                            className="py-2 px-3 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-white" />
                            <span>+ توليد رمز غرفة محلل</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[11px] font-mono text-[#787b86]">الرموز النشطة الجاهزة للنسخ:</div>
                          <div className="space-y-1.5 max-h-56 overflow-y-auto">
                            {generatedCodes.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded bg-[#131722] border border-[#2a2e39] text-xs font-mono"
                              >
                                <div>
                                  <span className="font-bold text-[#089981] tracking-wider me-2">{item.code}</span>
                                  <span className="text-[#787b86] text-[10px]">({item.type})</span>
                                </div>
                                <button
                                  onClick={() => handleCopy(item.code, item.code)}
                                  className="px-2 py-0.5 rounded bg-[#2a2e39] hover:bg-[#363a45] text-white text-[11px] cursor-pointer"
                                >
                                  {copiedId === item.code ? '✓ تم' : 'نسخ'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabErrorBoundary>
          )}
        </main>
      </div>

      {/* 4. MOBILE PERSISTENT BOTTOM NAVIGATION BAR (iOS / Android Native Style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1e222d]/95 backdrop-blur-md border-t border-[#2a2e39] pb-safe select-none shadow-2xl">
        <div className="grid grid-cols-5 h-14">
          <button
            onClick={() => {
              setActiveTab('signals');
              setSelectedTrader(null);
              soundManager.playClick();
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'signals' ? 'text-white' : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <Radio className={`w-4 h-4 ${activeTab === 'signals' ? 'text-[#089981]' : ''}`} />
            <span>{isAr ? 'الإشارات' : 'Signals'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('desk');
              setSelectedTrader(null);
              soundManager.playClick();
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'desk' ? 'text-white' : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <Compass className={`w-4 h-4 ${activeTab === 'desk' ? 'text-[#089981]' : ''}`} />
            <span>{isAr ? 'الأسواق' : 'Desk'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('aicoach');
              setSelectedTrader(null);
              soundManager.playClick();
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'aicoach' ? 'text-white' : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <Bot className={`w-4 h-4 ${activeTab === 'aicoach' ? 'text-[#089981]' : ''}`} />
            <span>{isAr ? 'الذكاء' : 'AI Coach'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('community');
              setSelectedTrader(null);
              soundManager.playClick();
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'community' ? 'text-white' : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <MessageSquare className={`w-4 h-4 ${activeTab === 'community' ? 'text-[#089981]' : ''}`} />
            <span>{isAr ? 'الشات' : 'Chat'}</span>
          </button>

          <button
            onClick={() => {
              setMobileDrawerOpen(true);
              soundManager.playClick();
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              mobileDrawerOpen ? 'text-[#089981]' : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <Menu className="w-4 h-4 text-[#089981]" />
            <span>{isAr ? 'الأدوات (13)' : 'All (13)'}</span>
          </button>
        </div>
      </nav>

      {/* 5. MOBILE FULL NAVIGATION DRAWER (Slide-over with all 13 Desks) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
          {/* Backdrop click target */}
          <div className="flex-1" onClick={() => setMobileDrawerOpen(false)} />

          {/* Drawer Panel */}
          <div
            className="w-[85%] max-w-sm h-full bg-[#1e222d] border-s border-[#2a2e39] flex flex-col justify-between overflow-hidden shadow-2xl"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#2a2e39] bg-[#131722]/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white text-[#131722] font-mono font-bold text-xs flex items-center justify-center shadow">
                  MBK
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[150px]">
                    {userName}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#089981]" />
                    <span className="text-[10px] text-[#089981] font-mono font-bold">
                      {isVIP ? 'VIP MEMBER' : 'DEMO MODE'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body: 13 Desks Categorized */}
            <div className="p-3 space-y-4 overflow-y-auto flex-1">
              {/* PWA Install Banner inside Drawer */}
              <div className="p-3 rounded-lg bg-[#131722] border border-[#089981]/40 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#089981]/20 text-[#089981] flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">{isAr ? 'تطبيق الهاتف MBK' : 'MBK Mobile Web App'}</div>
                    <div className="text-[10px] text-[#787b86]">
                      {isAr ? 'تثبيت سريع لـ iOS و Android' : 'Install for Android & iOS'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setPwaModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded bg-[#089981] text-[#131722] text-[11px] font-bold shrink-0 hover:bg-[#089981]/90 cursor-pointer shadow-sm"
                >
                  {isAr ? 'تثبيت ↗' : 'Install ↗'}
                </button>
              </div>

              {/* All 4 Categories */}
              {NAV_CATEGORIES.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="px-2 text-[10px] font-mono font-bold text-[#787b86] uppercase tracking-wider">
                    {isAr ? cat.titleAr : cat.titleEn}
                  </div>
                  {cat.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSelectedTrader(null);
                          setMobileDrawerOpen(false);
                          soundManager.playClick();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#131722] font-bold shadow-sm'
                            : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{isAr ? item.labelAr : item.labelEn}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                            isActive ? 'bg-[#131722] text-white' : item.badgeColor
                          }`}
                          dir="ltr"
                        >
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Drawer Footer: Quick Controls */}
            <div className="p-3 border-t border-[#2a2e39] bg-[#131722] flex items-center justify-between gap-2 pb-safe">
              {onToggleLang && (
                <button
                  onClick={onToggleLang}
                  className="flex-1 py-1.5 rounded bg-[#1e222d] border border-[#2a2e39] text-xs font-bold text-white flex items-center justify-center gap-1 cursor-pointer hover:bg-[#2a2e39]"
                >
                  <Globe className="w-3.5 h-3.5 text-[#089981]" />
                  <span>{isAr ? 'English' : 'عربي'}</span>
                </button>
              )}

              <button
                onClick={onToggleMute}
                className="p-2 rounded bg-[#1e222d] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer hover:bg-[#2a2e39]"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-[#f23645]" /> : <Volume2 className="w-4 h-4 text-[#089981]" />}
              </button>

              <button
                onClick={onLogout}
                className="p-2 rounded bg-[#1e222d] border border-[#2a2e39] text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer hover:bg-[#f23645]/20"
                title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PWA INSTALL MODAL */}
      <PWAInstallModal
        isOpen={pwaModalOpen}
        onClose={() => setPwaModalOpen(false)}
        lang={lang}
      />

      {/* MODAL: UNLOCK TRADER ROOM */}
      {unlockTraderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#089981]" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? `تفعيل غرفة ${unlockTraderModal.nameAr}` : `Unlock ${unlockTraderModal.nameEn}`}
                </h3>
              </div>
              <button
                onClick={() => setUnlockTraderModal(null)}
                className="p-1 rounded text-[#787b86] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#787b86] leading-relaxed">
              {isAr
                ? `أدخل رمز الدعوة الخاص بالمحلل (${unlockTraderModal.inviteCode}) أو رمز VIP2026 لتأكيد الصلاحية فورياً.`
                : `Enter invite code (${unlockTraderModal.inviteCode}) or master code VIP2026.`}
            </p>

            <form onSubmit={handleUnlockTrader} className="space-y-3">
              <input
                type="text"
                value={unlockCodeInput}
                onChange={(e) => setUnlockCodeInput(e.target.value)}
                placeholder="MBK2026 / VIP2026"
                className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-center text-sm font-mono text-white tracking-wider outline-none focus:border-[#089981]"
              />
              {unlockCodeError && (
                <p className="text-xs text-[#f23645] text-center">
                  {isAr ? 'الرمز غير صحيح، يرجى كتابة الرمز بدقة.' : 'Invalid invite code.'}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUnlockTraderModal(null)}
                  className="flex-1 py-2 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-[#787b86] hover:text-white transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-white hover:bg-[#d1d4dc] text-[#131722] text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  {isAr ? 'تأكيد ودخول' : 'Unlock Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
