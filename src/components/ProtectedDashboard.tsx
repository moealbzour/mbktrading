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
  TrendingUp,
  Target,
  Sparkles,
  Users,
  LogOut,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  ExternalLink,
  Bot,
  Copy,
  Clock,
  Radio,
  PlusCircle,
  Ticket,
  Lock,
  Unlock,
  Calendar,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  User,
  Crown,
  Globe,
  Sliders,
  ChevronRight,
  ChevronLeft,
  X,
  Send,
  Eye,
  EyeOff,
  BarChart2,
  BookOpen,
  DollarSign,
  Activity,
  Calculator,
  ArrowRight,
  ArrowLeft,
  Plus,
  KeyRound,
  ShieldAlert
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

type DashboardTab =
  | 'signals'
  | 'traders_hub'
  | 'market_chart'
  | 'ai_agent'
  | 'journal'
  | 'economic_calendar'
  | 'admin_center';

// Initial Verified Traders Directory
const INITIAL_TRADERS: TraderProfile[] = [
  {
    id: 'mbk_master',
    nameAr: 'MBK Master Institutional Engine',
    nameEn: 'MBK Master Institutional Engine',
    specialtyAr: 'المؤسس والمحرك الخوارزمي الرئيسي • US100 & XAUUSD',
    specialtyEn: 'Founder & Primary Algo Engine • US100 & XAUUSD',
    roleAr: 'المحرك المؤسسي الرسمي',
    roleEn: 'Official Institutional Engine',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    verifiedPipsMonth: 1420,
    winRate: 86.4,
    subscribersCount: 1240,
    isOfficial: true,
    specialties: ['US100', 'XAUUSD'],
    monthlyPrice: 0,
    inviteCode: 'MBK2026',
    descriptionAr: 'قناة خوارزميات وتوصيات المحرك المؤسسي الرئيسي المعتمد على كسر السيولة ونماذج FVG وOrder Blocks.',
    descriptionEn: 'Core institutional engine broadcasting algorithmic liquidity sweeps, FVGs, and order blocks.',
    signalsCount: 142
  },
  {
    id: 'captain_tariq',
    nameAr: 'كابتن طارق — قناص الذهب',
    nameEn: 'Captain Tariq • Gold Sniper',
    specialtyAr: 'محلل معتمد شريك • مضاربة الذهب والأوردر بلوك',
    specialtyEn: 'Certified Partner Analyst • XAUUSD SMC & Order Blocks',
    roleAr: 'محلل شريك معتمد',
    roleEn: 'Certified Partner Analyst',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    verifiedPipsMonth: 890,
    winRate: 81.0,
    subscribersCount: 385,
    isOfficial: false,
    specialties: ['XAUUSD'],
    monthlyPrice: 29,
    inviteCode: 'TARIQ2026',
    descriptionAr: 'خبير متخصص في اصطياد قيعان وقمم الذهب (XAUUSD) خلال افتتاح جلسة لندن ونيويورك بالاعتماد على مفاهيم SMC.',
    descriptionEn: 'Specialist sniper in Gold (XAUUSD) reversals during London and NY sessions based on Smart Money Concepts.',
    signalsCount: 68
  },
  {
    id: 'abu_khaled',
    nameAr: 'أبو خالد — خبير جلسة نيويورك',
    nameEn: 'Abu Khaled • Nasdaq NY Scalp',
    specialtyAr: 'محلل معتمد شريك • اختراقات مؤشر US100',
    specialtyEn: 'Certified Partner Analyst • Nasdaq 100 NY Scalp',
    roleAr: 'محلل شريك معتمد',
    roleEn: 'Certified Partner Analyst',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    verifiedPipsMonth: 740,
    winRate: 79.5,
    subscribersCount: 290,
    isOfficial: false,
    specialties: ['US100'],
    monthlyPrice: 29,
    inviteCode: 'KHALED2026',
    descriptionAr: 'مضارب سكالبينج سريع على عقود مؤشر ناسداك 100 الأمريكي خلال أول 90 دقيقة من افتتاح بورصة وول ستريت.',
    descriptionEn: 'High-frequency scalper targeting US100 contracts during the first 90 minutes of the Wall Street open.',
    signalsCount: 54
  }
];

// Initial exclusive posts for traders
const INITIAL_TRADER_POSTS: Record<string, TraderPost[]> = {
  mbk_master: [
    {
      id: 'post-m1',
      traderId: 'mbk_master',
      traderName: 'MBK Master Engine',
      traderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      titleAr: 'تحديث خوارزمي: سحب سيولة قاع لندن على مؤشر ناسداك US100',
      titleEn: 'Algo Update: London Low Liquidity Sweep on Nasdaq US100',
      symbol: 'US100',
      action: 'BUY',
      entryPrice: 20440.0,
      tp1: 20500.0,
      tp2: 20560.0,
      sl: 20380.0,
      pips: 120,
      status: 'TP2_HIT',
      notesAr: 'تم تفعيل أمر الشراء المؤسسي بعد كسر قاع لندن وتأكيد نموذج FVG الصاعد على فريم 15 دقيقة.',
      notesEn: 'Institutional buy triggered after sweeping London swing low with 15m bullish FVG confirmation.',
      timestamp: 'قبل ساعتين',
      likes: 42
    },
    {
      id: 'post-m2',
      traderId: 'mbk_master',
      traderName: 'MBK Master Engine',
      traderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      titleAr: 'صفقة شراء الذهب XAUUSD — استهداف قمة الأمس',
      titleEn: 'Gold XAUUSD Buy Setup — Targeting Previous Day High',
      symbol: 'XAUUSD',
      action: 'BUY',
      entryPrice: 2668.5,
      tp1: 2676.0,
      tp2: 2685.0,
      sl: 2658.0,
      pips: 164,
      status: 'ACTIVE',
      notesAr: 'إعادة اختبار منطقة الطلب الرئيسية 2,668$ مع تباعد إيجابي وتراجع عوائد السندات الأمريكية.',
      notesEn: 'Retest of key 2,668 demand pool with positive divergence and softening US bond yields.',
      timestamp: 'قبل 45 دقيقة',
      likes: 29
    }
  ],
  captain_tariq: [
    {
      id: 'post-t1',
      traderId: 'captain_tariq',
      traderName: 'كابتن طارق (قناص الذهب)',
      traderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      titleAr: 'اقتناص ارتداد الذهب 2,670$ قبل إغلاق لندن',
      titleEn: 'Gold Rebound Sniper Entry @ 2,670 before London Close',
      symbol: 'XAUUSD',
      action: 'BUY',
      entryPrice: 2670.2,
      tp1: 2678.0,
      tp2: 2686.0,
      sl: 2662.0,
      pips: 78,
      status: 'TP1_HIT',
      notesAr: 'يا شباب، منطقة 2668-2670 منطقة رفض قوية جداً. الدخول تم بعقد 0.5 لوت مع نقل الوقف للدخول الآن.',
      notesEn: 'Team, 2,668-2,670 is a severe rejection zone. Moved stop-loss to breakeven after TP1 hit.',
      timestamp: 'قبل ساعة',
      likes: 35
    }
  ],
  abu_khaled: [
    {
      id: 'post-k1',
      traderId: 'abu_khaled',
      traderName: 'أبو خالد (خبير نيويورك)',
      traderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      titleAr: 'سكالبينج سريع على ناسداك US100 مع جرس الافتتاح',
      titleEn: 'Fast Nasdaq US100 Opening Bell Scalp',
      symbol: 'US100',
      action: 'BUY',
      entryPrice: 20455.0,
      tp1: 20495.0,
      tp2: 20535.0,
      sl: 20410.0,
      pips: 80,
      status: 'TP2_HIT',
      notesAr: 'افتتاح شمعة الـ 9:30 صباحاً كان انفجارياً فوق 20440. قفلنا الهدف الثاني بربح ممتاز وخرجنا من السوق.',
      notesEn: 'Aggressive 9:30 opening expansion above 20,440. Both targets secured, flat for the session.',
      timestamp: 'قبل 3 ساعات',
      likes: 27
    }
  ]
};

// Initial subscriber chat messages per trader
const INITIAL_TRADER_CHATS: Record<
  string,
  Array<{ id: string; user: string; role: string; text: string; time: string; isAnalyst?: boolean }>
> = {
  mbk_master: [
    {
      id: 'c1',
      user: 'خالد المنصوري',
      role: 'مشترك VIP',
      text: 'إشارة الذهب كانت دقيقة جداً يا شباب، حققت الهدف الأول في 15 دقيقة فقط!',
      time: '14:20'
    },
    {
      id: 'c2',
      user: 'فهد العتيبي',
      role: 'مشترك VIP',
      text: 'هل تتوقعون استمرار صعود ناسداك حتى موعد بيانات التضخم؟',
      time: '14:25'
    },
    {
      id: 'c3',
      user: 'MBK Institutional Engine',
      role: 'المؤسس والمحرك الرئيسي',
      text: 'نعم فهد، السيولة المؤسسية تتمركز عند قمة 20,560، الالتزام بالوقف عند الدخول هو الضمانة.',
      time: '14:27',
      isAnalyst: true
    }
  ],
  captain_tariq: [
    {
      id: 'tc1',
      user: 'سلطان القحطاني',
      role: 'مشترك بالقناة',
      text: 'كابتن طارق متى الدخول القادم على الذهب؟',
      time: '13:10'
    },
    {
      id: 'tc2',
      user: 'كابتن طارق (قناص الذهب)',
      role: 'محلل شريك',
      text: 'ننتظر إغلاق شمعة الـ 4 ساعات فوق 2,672 لتأكيد الكسر، لا تتسرعوا.',
      time: '13:15',
      isAnalyst: true
    }
  ],
  abu_khaled: [
    {
      id: 'kc1',
      user: 'عمر التميمي',
      role: 'مشترك بالقناة',
      text: 'سكالبينج نيويورك كان نار اليوم يا أبو خالد، تسلم إيدك.',
      time: '15:40'
    },
    {
      id: 'kc2',
      user: 'أبو خالد (خبير نيويورك)',
      role: 'محلل شريك',
      text: 'حبيبي يا عمر، أهم شي الالتزام بنصف لوت وعدم الطمع!',
      time: '15:42',
      isAnalyst: true
    }
  ]
};

// Trade Journal Initial State
interface JournalEntry {
  id: string;
  date: string;
  symbol: MarketSymbol;
  type: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  pnl: number;
  mindset: 'DISCIPLINED' | 'FOMO' | 'REVENGE';
  notes: string;
}

const INITIAL_JOURNAL: JournalEntry[] = [
  {
    id: 'j-1',
    date: '2026-10-13 14:10',
    symbol: 'US100',
    type: 'BUY',
    entry: 20440,
    exit: 20560,
    pnl: 1200,
    mindset: 'DISCIPLINED',
    notes: 'الدخول بعد تأكيد سحب سيولة لندن مع إشارة المحرك. التزام تام بخطة الدخول والخروج.'
  },
  {
    id: 'j-2',
    date: '2026-10-13 11:30',
    symbol: 'XAUUSD',
    type: 'BUY',
    entry: 2668.5,
    exit: 2684.0,
    pnl: 775,
    mindset: 'DISCIPLINED',
    notes: 'صفقة نموذجية على الذهب عند منطقة الأوردر بلوك المؤسسي.'
  },
  {
    id: 'j-3',
    date: '2026-10-12 16:45',
    symbol: 'US100',
    type: 'SELL',
    entry: 20380,
    exit: 20450,
    pnl: -350,
    mindset: 'FOMO',
    notes: 'دخول متسرع عكس الاتجاه بدون تأكيد إغلاق شمعة 15m. خطأ استعجال (FOMO).'
  },
  {
    id: 'j-4',
    date: '2026-10-11 15:00',
    symbol: 'XAUUSD',
    type: 'SELL',
    entry: 2650,
    exit: 2666,
    pnl: -800,
    mindset: 'REVENGE',
    notes: 'محاولة تعويض خسارة سابقة بحجم لوت مضاعف. تم خرق إدارة المخاطر.'
  }
];

export const ProtectedDashboard: React.FC<Props> = ({
  user,
  tickers,
  signals,
  economicEvents,
  selectedSymbol,
  onSelectSymbol,
  onAddSignal,
  onCopySignalToAccount,
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
}) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<DashboardTab>('signals');
  const isAr = lang === 'ar';

  // VIP / Role Status
  const isVIP = user.role === 'VIP' || user.role === 'ADMIN';

  // Signals Feed Tab State
  const [signalFilterSymbol, setSignalFilterSymbol] = useState<string>('ALL');
  const [signalChannelFilter, setSignalChannelFilter] = useState<'ALL' | 'ENGINE' | 'MANUAL'>('ALL');
  const [drawerSignal, setDrawerSignal] = useState<TradeSignal | null>(null);
  const [isChartDrawerOpen, setIsChartDrawerOpen] = useState(false);
  const [copiedSignalId, setCopiedSignalId] = useState<string | null>(null);

  // Traders Marketplace Tab State
  const [tradersList, setTradersList] = useState<TraderProfile[]>(INITIAL_TRADERS);
  const [followedTraders, setFollowedTraders] = useState<string[]>(['mbk_master']);
  const [unlockedTraders, setUnlockedTraders] = useState<string[]>(['mbk_master']);
  const [traderFilter, setTraderFilter] = useState<'ALL' | 'XAUUSD' | 'US100'>('ALL');
  const [selectedTraderId, setSelectedTraderId] = useState<string | null>(null);
  const [traderPosts, setTraderPosts] = useState<Record<string, TraderPost[]>>(INITIAL_TRADER_POSTS);
  const [traderChats, setTraderChats] = useState<typeof INITIAL_TRADER_CHATS>(INITIAL_TRADER_CHATS);
  const [traderChatInput, setTraderChatInput] = useState('');
  const [unlockModalTrader, setUnlockModalTrader] = useState<TraderProfile | null>(null);
  const [traderInviteCodeInput, setTraderInviteCodeInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // AI Agent & Calculators Tab State
  const [aiSubTab, setAiSubTab] = useState<'chat' | 'calculator' | 'auditor' | 'radar'>('chat');
  const [calcAccountBalance, setCalcAccountBalance] = useState<number>(10000);
  const [calcRiskPercent, setCalcRiskPercent] = useState<number>(1);
  const [calcStopLossPips, setCalcStopLossPips] = useState<number>(30);
  const [calcSymbol, setCalcSymbol] = useState<MarketSymbol>('US100');
  const [auditorEntry, setAuditorEntry] = useState<number>(20440);
  const [auditorTp, setAuditorTp] = useState<number>(20560);
  const [auditorSl, setAuditorSl] = useState<number>(20380);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'model'; text: string; time: string }>>([
    {
      role: 'model',
      text: isAr
        ? 'أهلاً بك في وكيل MBK الذكي (SMC Core Engine). كيف يمكنني مساعدتك في تحليل هياكل السوق، كسر السيولة، أو حساب حجم الصفقات اليوم؟'
        : 'Welcome to MBK Smart Agent (SMC Core Engine). How can I assist you with market structure, liquidity sweeps, or position sizing today?',
      time: '12:00'
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiIsTyping, setAiIsTyping] = useState(false);

  // Journal Tab State
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(INITIAL_JOURNAL);
  const [isNewJournalOpen, setIsNewJournalOpen] = useState(false);
  const [newJournalSymbol, setNewJournalSymbol] = useState<MarketSymbol>('US100');
  const [newJournalType, setNewJournalType] = useState<'BUY' | 'SELL'>('BUY');
  const [newJournalEntryPrice, setNewJournalEntryPrice] = useState<number>(20450);
  const [newJournalExitPrice, setNewJournalExitPrice] = useState<number>(20510);
  const [newJournalPnl, setNewJournalPnl] = useState<number>(600);
  const [newJournalMindset, setNewJournalMindset] = useState<'DISCIPLINED' | 'FOMO' | 'REVENGE'>('DISCIPLINED');
  const [newJournalNotes, setNewJournalNotes] = useState<string>('دخول منضبط مع جلسة نيويورك');

  // Admin / CEO Command Center State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<
    Array<{ code: string; type: string; traderName?: string; createdAt: string; status: 'ACTIVE' | 'USED' }>
  >([
    { code: 'VIP-9182', type: 'عضوية VIP كاملة', createdAt: 'منذ يوم', status: 'ACTIVE' },
    { code: 'TARIQ-4819', type: 'غرفة كابتن طارق', traderName: 'كابتن طارق', createdAt: 'منذ ساعتين', status: 'ACTIVE' },
    { code: 'KHALED-7201', type: 'غرفة أبو خالد', traderName: 'أبو خالد', createdAt: 'منذ 3 ساعات', status: 'ACTIVE' }
  ]);
  const [newCodeType, setNewCodeType] = useState<'VIP' | 'TRADER'>('VIP');
  const [newCodeTraderId, setNewCodeTraderId] = useState<string>('captain_tariq');
  const [createdCodeToast, setCreatedCodeToast] = useState<string | null>(null);

  // Quick Signal Publisher state inside Admin Center
  const [pubTraderId, setPubTraderId] = useState('mbk_master');
  const [pubSymbol, setPubSymbol] = useState<MarketSymbol>('US100');
  const [pubAction, setPubAction] = useState<'BUY' | 'SELL'>('BUY');
  const [pubEntry, setPubEntry] = useState<number>(20480);
  const [pubTp1, setPubTp1] = useState<number>(20540);
  const [pubTp2, setPubTp2] = useState<number>(20600);
  const [pubSl, setPubSl] = useState<number>(20420);
  const [pubNotes, setPubNotes] = useState<string>('تأكيد ارتداد من منطقة الطلب مع سحب سيولة');
  const [pubSuccess, setPubSuccess] = useState(false);

  // Add Partner Trader state inside Admin Center
  const [newTraderName, setNewTraderName] = useState('');
  const [newTraderSpecialty, setNewTraderSpecialty] = useState('');
  const [newTraderPips, setNewTraderPips] = useState(650);
  const [newTraderWinRate, setNewTraderWinRate] = useState(78.5);
  const [newTraderPrice, setNewTraderPrice] = useState(29);
  const [newTraderInvite, setNewTraderInvite] = useState('');
  const [traderAddedSuccess, setTraderAddedSuccess] = useState(false);

  // Handler: Copy Signal
  const handleCopySignal = (sig: TradeSignal) => {
    soundManager.playClick();
    onCopySignalToAccount(sig);
    setCopiedSignalId(sig.id);
    const summary = `${sig.symbol} ${sig.type} @ ${sig.entryPrice} | TP1: ${sig.tp1} | TP2: ${sig.tp2} | SL: ${sig.sl}`;
    navigator.clipboard.writeText(summary);
    setTimeout(() => setCopiedSignalId(null), 2500);
  };

  // Handler: Open Chart Drawer
  const handleOpenChartDrawer = (sig: TradeSignal) => {
    soundManager.playClick();
    setDrawerSignal(sig);
    onSelectSymbol(sig.symbol);
    setIsChartDrawerOpen(true);
  };

  // Handler: Toggle Follow Trader
  const handleToggleFollowTrader = (traderId: string) => {
    soundManager.playClick();
    if (followedTraders.includes(traderId)) {
      setFollowedTraders((prev) => prev.filter((id) => id !== traderId));
      setTradersList((prev) =>
        prev.map((t) => (t.id === traderId ? { ...t, subscribersCount: Math.max(0, t.subscribersCount - 1) } : t))
      );
    } else {
      setFollowedTraders((prev) => [...prev, traderId]);
      setTradersList((prev) =>
        prev.map((t) => (t.id === traderId ? { ...t, subscribersCount: t.subscribersCount + 1 } : t))
      );
    }
  };

  // Handler: Enter Trader Room
  const handleEnterTraderRoom = (trader: TraderProfile) => {
    soundManager.playClick();
    if (unlockedTraders.includes(trader.id) || isVIP || trader.isOfficial) {
      setSelectedTraderId(trader.id);
    } else {
      setUnlockModalTrader(trader);
      setTraderInviteCodeInput('');
      setUnlockError(null);
    }
  };

  // Handler: Unlock Trader via Invite Code or Platform Payment
  const handleUnlockTrader = (method: 'CODE' | 'PAY') => {
    if (!unlockModalTrader) return;
    if (method === 'CODE') {
      const code = traderInviteCodeInput.trim().toUpperCase();
      const validCode = unlockModalTrader.inviteCode.toUpperCase();
      // Also accept master promo codes or generated codes
      const isCodeMatch =
        code === validCode ||
        code === 'MBK2026' ||
        code === 'VIP2026' ||
        generatedCodes.some((gc) => gc.code.toUpperCase() === code);

      if (!code) {
        setUnlockError(isAr ? 'يرجى إدخال رمز الدعوة.' : 'Please enter invite code.');
        return;
      }
      if (!isCodeMatch) {
        setUnlockError(isAr ? 'رمز الدعوة غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired invite code.');
        return;
      }
    }

    soundManager.playProfitChime();
    confetti({ particleCount: 70, spread: 60 });
    setUnlockedTraders((prev) => [...prev, unlockModalTrader.id]);
    setSelectedTraderId(unlockModalTrader.id);
    setUnlockModalTrader(null);
  };

  // Handler: Send Message in Trader's Private Chat
  const handleSendTraderChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traderChatInput.trim() || !selectedTraderId) return;
    soundManager.playClick();

    const newMsg = {
      id: `tc-${Date.now()}`,
      user: user.name || (isAr ? 'أنت' : 'You'),
      role: isVIP ? 'مشترك VIP' : 'عضو القناة',
      text: traderChatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTraderChats((prev) => ({
      ...prev,
      [selectedTraderId]: [...(prev[selectedTraderId] || []), newMsg]
    }));
    setTraderChatInput('');
  };

  // Handler: Send AI Agent Prompt
  const handleSendAiPrompt = (promptText?: string) => {
    const textToSend = promptText || aiInput;
    if (!textToSend.trim()) return;
    soundManager.playClick();

    const userMsg = {
      role: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setAiIsTyping(true);

    setTimeout(() => {
      setAiIsTyping(false);
      soundManager.playSignalPing();
      let reply = '';
      if (textToSend.includes('ذهب') || textToSend.toLowerCase().includes('gold') || textToSend.includes('XAUUSD')) {
        reply = isAr
          ? 'تحليل الذهب (XAUUSD): الهيكل الصاعد لا يزال قائماً فوق 2,660$. نلاحظ وجود فجوة سعرية (FVG) بين 2,668$ و 2,672$. استمرار التداول فوقها يدعم استهداف 2,685$ ثم 2,700$. وقف الخسارة البنيوي أسفل 2,658$.'
          : 'Gold (XAUUSD) SMC Analysis: Bullish structure holds firm above $2,660. Bullish FVG noted between $2,668 and $2,672. Targets: $2,685 then $2,700. Structural invalidation under $2,658.';
      } else if (textToSend.includes('ناسداك') || textToSend.toLowerCase().includes('nasdaq') || textToSend.includes('US100')) {
        reply = isAr
          ? 'تحليل ناسداك (US100): تم تأكيد سحب سيولة البائعين عند 20,430. ارتداد قوي مدعوم بمتوسط EMA 21. أهداف الشراء: 20,500 (+60 pips) ثم 20,560 (+120 pips). كسر 20,380 يلغي النموذج.'
          : 'Nasdaq (US100) Analysis: Sellers liquidity sweep confirmed at 20,430. Strong bounce backed by EMA 21. Targets: 20,500 (+60 pips) then 20,560 (+120 pips). Invalidation below 20,380.';
      } else {
        reply = isAr
          ? 'تحليل MBK Institutional Engine: الاتجاه العام إيجابي مع سيطرة المشترين المؤسسيين. نوصي بعدم الدخول قبل اكتمال شمعة الـ 15 دقيقة والتأكد من توافر معدل عائد للمخاطرة 1 : 2 على الأقل.'
          : 'MBK Institutional Engine: Macro trend remains bullish with institutional accumulation. Await 15m candle close and ensure minimum 1:2 Risk/Reward before execution.';
      }

      setAiMessages((prev) => [
        ...prev,
        {
          role: 'model' as const,
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 700);
  };

  // Handler: Add Trade to Journal
  const handleAddJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playProfitChime();
    const entry: JournalEntry = {
      id: `j-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      symbol: newJournalSymbol,
      type: newJournalType,
      entry: newJournalEntryPrice,
      exit: newJournalExitPrice,
      pnl: newJournalPnl,
      mindset: newJournalMindset,
      notes: newJournalNotes
    };
    setJournalEntries((prev) => [entry, ...prev]);
    setIsNewJournalOpen(false);
  };

  // Handler: Admin PIN Verification
  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput.trim() === '2026') {
      soundManager.playProfitChime();
      setIsAdminUnlocked(true);
      setAdminPinError(false);
    } else {
      soundManager.playClick();
      setAdminPinError(true);
    }
  };

  // Handler: Generate VIP / Trader Code
  const handleGenerateNewCode = () => {
    soundManager.playClick();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = newCodeType === 'VIP' ? 'VIP' : newCodeTraderId === 'captain_tariq' ? 'TARIQ' : 'KHALED';
    const code = `${prefix}-${randNum}`;
    const traderObj = tradersList.find((t) => t.id === newCodeTraderId);

    const newCodeItem = {
      code,
      type: newCodeType === 'VIP' ? 'عضوية VIP كاملة' : `غرفة ${traderObj?.nameAr || 'المحلل'}`,
      traderName: newCodeType === 'TRADER' ? traderObj?.nameAr : undefined,
      createdAt: 'الآن',
      status: 'ACTIVE' as const
    };

    setGeneratedCodes((prev) => [newCodeItem, ...prev]);
    setCreatedCodeToast(code);
    navigator.clipboard.writeText(code);
    setTimeout(() => setCreatedCodeToast(null), 3500);
  };

  // Handler: Publish Signal from Admin Center
  const handlePublishSignalFromAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playProfitChime();
    confetti({ particleCount: 50, spread: 60 });

    const traderObj = tradersList.find((t) => t.id === pubTraderId);
    const newSig: TradeSignal = {
      id: `sig-pub-${Date.now()}`,
      symbol: pubSymbol,
      type: pubAction,
      entryPrice: pubEntry,
      tp1: pubTp1,
      tp2: pubTp2,
      sl: pubSl,
      currentPrice: pubEntry,
      pips: 0,
      status: 'ACTIVE',
      riskReward: '1 : 2.5',
      timeframe: '15m',
      confidence: 90,
      strategyName: traderObj ? traderObj.nameAr : 'MBK Institutional Strategy',
      createdAt: 'الآن',
      verifiedWebhook: true,
      notesAr: pubNotes,
      channel: 'MANUAL',
      author: traderObj?.nameAr || 'فريق إدارة MBK'
    };

    onAddSignal(newSig);
    setPubSuccess(true);
    setTimeout(() => setPubSuccess(false), 3000);
  };

  // Handler: Add Partner Trader to Directory
  const handleAddNewTrader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraderName.trim()) return;
    soundManager.playProfitChime();

    const newTrader: TraderProfile = {
      id: `trader-${Date.now()}`,
      nameAr: newTraderName.trim(),
      nameEn: newTraderName.trim(),
      specialtyAr: newTraderSpecialty.trim() || 'محلل فني معتمد',
      specialtyEn: 'Certified Technical Analyst',
      roleAr: 'محلل شريك معتمد',
      roleEn: 'Partner Analyst',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      verifiedPipsMonth: newTraderPips,
      winRate: newTraderWinRate,
      subscribersCount: 15,
      isOfficial: false,
      specialties: ['US100', 'XAUUSD'],
      monthlyPrice: newTraderPrice,
      inviteCode: newTraderInvite.trim().toUpperCase() || `TRADER-${Math.floor(1000 + Math.random() * 9000)}`,
      descriptionAr: 'محلل معتمد جديد انضم حديثاً إلى شبكة محللي MBKtrading.',
      descriptionEn: 'New certified analyst joined the MBKtrading network.',
      signalsCount: 1
    };

    setTradersList((prev) => [...prev, newTrader]);
    setTraderAddedSuccess(true);
    setNewTraderName('');
    setNewTraderSpecialty('');
    setNewTraderInvite('');
    setTimeout(() => setTraderAddedSuccess(false), 3000);
  };

  // Filtered Signals
  const filteredSignals = signals.filter((sig) => {
    if (signalFilterSymbol !== 'ALL' && sig.symbol !== signalFilterSymbol) return false;
    if (signalChannelFilter === 'ENGINE' && sig.channel === 'MANUAL') return false;
    if (signalChannelFilter === 'MANUAL' && sig.channel !== 'MANUAL') return false;
    return true;
  });

  // Journal Calculations (Disciplined vs FOMO Cost)
  const disciplinedTrades = journalEntries.filter((j) => j.mindset === 'DISCIPLINED');
  const disciplinedPnl = disciplinedTrades.reduce((acc, curr) => acc + curr.pnl, 0);

  const emotionalTrades = journalEntries.filter((j) => j.mindset !== 'DISCIPLINED');
  const emotionalCost = emotionalTrades.reduce((acc, curr) => acc + Math.abs(curr.pnl), 0);

  const totalJournalPnl = journalEntries.reduce((acc, curr) => acc + curr.pnl, 0);
  const potentialDisciplinedPnl = disciplinedPnl + (emotionalTrades.length > 0 ? 0 : 0);
  const disciplineScore = Math.round((disciplinedTrades.length / Math.max(1, journalEntries.length)) * 100);

  // Lot Size Calculation Result
  const lotRiskDollars = (calcAccountBalance * (calcRiskPercent / 100));
  const lotPipValue = calcStopLossPips > 0 ? lotRiskDollars / calcStopLossPips : 0;
  const calculatedLotSize = Number((lotPipValue / 10).toFixed(2));

  // Risk to Reward Calculation
  const rewardPips = Math.abs(auditorTp - auditorEntry);
  const riskPips = Math.abs(auditorEntry - auditorSl);
  const calculatedRrRatio = riskPips > 0 ? (rewardPips / riskPips).toFixed(2) : '1.0';
  const breakevenWinRate = riskPips + rewardPips > 0 ? ((riskPips / (riskPips + rewardPips)) * 100).toFixed(1) : '50.0';

  return (
    <div
      className="min-h-screen bg-[#131722] text-[#d1d4dc] flex flex-col font-['Cairo',sans-serif] select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. TOP LIVE TICKER TAPE (Official TradingView Pure Dark Ticker) */}
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
                  v2.8 LIVE
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
          {/* Live Online Traders Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse"></span>
            <span className="text-[#089981] font-bold" dir="ltr">+{onlineTraders}</span>
            <span className="text-[#787b86] text-[11px]">{isAr ? 'متداول نشط' : 'active'}</span>
          </div>

          {/* User Profile Info Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#131722] border border-[#2a2e39]">
            <div className="w-6 h-6 rounded-full bg-[#2a2e39] border border-[#363a45] flex items-center justify-center text-xs font-bold text-white uppercase">
              {user.name ? user.name[0] : 'U'}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                {user.name || user.email.split('@')[0]}
              </div>
              <div className="flex items-center gap-1">
                {isVIP ? (
                  <span className="text-[10px] font-bold text-[#089981] flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-[#089981]" />
                    VIP
                  </span>
                ) : (
                  <span className="text-[10px] text-[#787b86]">FREE</span>
                )}
                {user.telegramUsername && (
                  <span className="text-[10px] text-[#787b86] font-mono truncate max-w-[70px]" dir="ltr">
                    {user.telegramUsername}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* VIP Upgrade Button for Free Users (NO PLAIN TEXT PROMO CODES SHOWN) */}
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

      {/* 3. MAIN TERMINAL WORKSPACE: FIXED SIDEBAR + TAB CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* FIXED SIDEBAR (Desktop) */}
        <aside className="w-64 bg-[#1e222d] border-e border-[#2a2e39] hidden md:flex flex-col justify-between shrink-0 select-none">
          {/* Sidebar Nav Links */}
          <div className="p-3 space-y-1 overflow-y-auto">
            {/* Tab 1: Signals Feed */}
            <button
              onClick={() => {
                setActiveTab('signals');
                setSelectedTraderId(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'signals'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className={`w-4 h-4 ${activeTab === 'signals' ? 'text-[#131722]' : 'text-[#089981]'}`} />
                <span>{isAr ? 'الإشارات والتوصيات' : 'Live Signals Feed'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'signals' ? 'bg-[#131722] text-white' : 'bg-[#089981]/20 text-[#089981]'
                }`}
              >
                {signals.length}
              </span>
            </button>

            {/* Tab 2: Traders Marketplace & Private Hubs */}
            <button
              onClick={() => {
                setActiveTab('traders_hub');
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'traders_hub'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${activeTab === 'traders_hub' ? 'text-[#131722]' : 'text-white'}`} />
                <span>{isAr ? 'نخبة المحللين والقنوات' : 'Traders Marketplace'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'traders_hub' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#d1d4dc]'
                }`}
              >
                {tradersList.length}
              </span>
            </button>

            {/* Tab 3: Chart & Live Market Desk */}
            <button
              onClick={() => {
                setActiveTab('market_chart');
                setSelectedTraderId(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'market_chart'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart2 className={`w-4 h-4 ${activeTab === 'market_chart' ? 'text-[#131722]' : 'text-white'}`} />
                <span>{isAr ? 'الشارت وغرفة الأسواق' : 'Live Chart Desk'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activeTab === 'market_chart' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#787b86]'
                }`}
              >
                NDX
              </span>
            </button>

            {/* Tab 4: SMC AI Agent & Calculators */}
            <button
              onClick={() => {
                setActiveTab('ai_agent');
                setSelectedTraderId(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ai_agent'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bot className={`w-4 h-4 ${activeTab === 'ai_agent' ? 'text-[#131722]' : 'text-[#089981]'}`} />
                <span>{isAr ? 'وكيل الذكاء الاصطناعي والحاسبة' : 'SMC AI & Calculator'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activeTab === 'ai_agent' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#089981]'
                }`}
              >
                SMC
              </span>
            </button>

            {/* Tab 5: Smart Journal & Habit Detective */}
            <button
              onClick={() => {
                setActiveTab('journal');
                setSelectedTraderId(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className={`w-4 h-4 ${activeTab === 'journal' ? 'text-[#131722]' : 'text-white'}`} />
                <span>{isAr ? 'مفكرة التداول وكاشف العادات' : 'Smart Journal & Habits'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'journal' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#089981]'
                }`}
              >
                {disciplineScore}%
              </span>
            </button>

            {/* Tab 6: Economic Calendar & Macro Radar */}
            <button
              onClick={() => {
                setActiveTab('economic_calendar');
                setSelectedTraderId(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'economic_calendar'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'text-[#d1d4dc] hover:bg-[#2a2e39] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className={`w-4 h-4 ${activeTab === 'economic_calendar' ? 'text-[#131722]' : 'text-white'}`} />
                <span>{isAr ? 'الأجندة الاقتصادية والأخبار' : 'Economic Calendar'}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activeTab === 'economic_calendar' ? 'bg-[#131722] text-white' : 'bg-[#2a2e39] text-[#787b86]'
                }`}
              >
                CPI/NFP
              </span>
            </button>
          </div>

          {/* Bottom Sidebar: Admin / CEO Command Center Link */}
          <div className="p-3 border-t border-[#2a2e39] space-y-2">
            <button
              onClick={() => {
                setActiveTab('admin_center');
                setSelectedTraderId(null);
                soundManager.playClick();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'admin_center'
                  ? 'bg-white text-[#131722] font-bold shadow-sm'
                  : 'bg-[#131722] text-[#787b86] hover:text-white border border-[#2a2e39] hover:border-[#363a45]'
              }`}
            >
              <div className="flex items-center gap-2">
                <KeyRound
                  className={`w-4 h-4 ${activeTab === 'admin_center' ? 'text-[#131722]' : 'text-[#089981]'}`}
                />
                <span>{isAr ? 'لوحة إدارة المنصة (CEO)' : 'CEO Command Center'}</span>
              </div>
              <span className="text-[10px] font-mono text-[#787b86]">PIN</span>
            </button>

            {/* Regulated Broker Partner Box */}
            <div
              onClick={onOpenBrokerModal}
              className="p-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] hover:border-[#363a45] transition-all cursor-pointer group text-right"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-white group-hover:text-[#089981] transition-colors">
                  {isAr ? 'الوسيط الشريك المعتمد' : 'Partner Broker'}
                </span>
                <ExternalLink className="w-3 h-3 text-[#787b86] group-hover:text-white" />
              </div>
              <p className="text-[10px] text-[#787b86] leading-relaxed">
                {isAr ? 'تداول بسبريد مؤسسي منخفض مع تفعيل VIP مجاناً مدى الحياة.' : 'Institutional spreads + free lifetime VIP.'}
              </p>
            </div>
          </div>
        </aside>

        {/* MOBILE TOP TAB BAR (Small screens) */}
        <div className="md:hidden flex items-center overflow-x-auto bg-[#1e222d] border-b border-[#2a2e39] px-2 py-1.5 gap-1 shrink-0 z-20">
          <button
            onClick={() => {
              setActiveTab('signals');
              setSelectedTraderId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'signals' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '📡 الإشارات' : 'Signals'}
          </button>
          <button
            onClick={() => {
              setActiveTab('traders_hub');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'traders_hub' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '🏆 المحللين' : 'Traders'}
          </button>
          <button
            onClick={() => {
              setActiveTab('market_chart');
              setSelectedTraderId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'market_chart' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '📈 الشارت' : 'Chart'}
          </button>
          <button
            onClick={() => {
              setActiveTab('ai_agent');
              setSelectedTraderId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'ai_agent' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '🤖 الذكاء الاصطناعي' : 'AI'}
          </button>
          <button
            onClick={() => {
              setActiveTab('journal');
              setSelectedTraderId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'journal' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '📓 المفكرة' : 'Journal'}
          </button>
          <button
            onClick={() => {
              setActiveTab('economic_calendar');
              setSelectedTraderId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'economic_calendar' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '📅 الأجندة' : 'Calendar'}
          </button>
          <button
            onClick={() => {
              setActiveTab('admin_center');
              setSelectedTraderId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'admin_center' ? 'bg-white text-[#131722] font-bold' : 'text-[#787b86]'
            }`}
          >
            {isAr ? '⚙️ الإدارة' : 'Admin'}
          </button>
        </div>

        {/* WORKSPACE MAIN CONTENT AREA (ONLY SELECTED TAB RENDERS) */}
        <main className="flex-1 overflow-y-auto bg-[#131722] relative">
          {/* ======================================================== */}
          {/* TAB 1: 📡 LIVE SIGNALS FEED (DEFAULT TAB, NO GIANT CHART) */}
          {/* ======================================================== */}
          {activeTab === 'signals' && (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              {/* Header + Filters */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 sm:p-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#089981] animate-ping"></span>
                    <h1 className="text-lg sm:text-xl font-bold text-white">
                      {isAr ? 'غرفة الإشارات والتنبيهات المباشرة' : 'Live Institutional Signals Feed'}
                    </h1>
                  </div>
                  <p className="text-xs text-[#787b86]">
                    {isAr
                      ? 'تنبيهات مؤشرات Pine Script الآلية المعتمدة وتوصيات المحللين المباشرة مع مستويات وقف الخسارة وأهداف جني الأرباح.'
                      : 'Verified automated Pine Script signals and manual analyst setups with precise invalidation and targets.'}
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Symbol Selector */}
                  <div className="flex items-center p-1 bg-[#131722] rounded-xl border border-[#2a2e39] text-xs">
                    {['ALL', 'US100', 'XAUUSD', 'EURUSD', 'BTCUSD'].map((sym) => (
                      <button
                        key={sym}
                        onClick={() => {
                          setSignalFilterSymbol(sym);
                          soundManager.playClick();
                        }}
                        className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-all cursor-pointer ${
                          signalFilterSymbol === sym
                            ? 'bg-white text-[#131722] font-bold'
                            : 'text-[#787b86] hover:text-white'
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>

                  {/* Channel Filter */}
                  <div className="flex items-center p-1 bg-[#131722] rounded-xl border border-[#2a2e39] text-xs">
                    <button
                      onClick={() => setSignalChannelFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        signalChannelFilter === 'ALL'
                          ? 'bg-white text-[#131722] font-bold'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                    >
                      {isAr ? 'الكل' : 'All'}
                    </button>
                    <button
                      onClick={() => setSignalChannelFilter('ENGINE')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        signalChannelFilter === 'ENGINE'
                          ? 'bg-white text-[#131722] font-bold'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                    >
                      {isAr ? '🤖 المحرك الآلي' : '🤖 Algo Engine'}
                    </button>
                    <button
                      onClick={() => setSignalChannelFilter('MANUAL')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        signalChannelFilter === 'MANUAL'
                          ? 'bg-white text-[#131722] font-bold'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                    >
                      {isAr ? '👤 اليدوية' : '👤 Manual'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Signals Grid (Uncluttered, High Contrast) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSignals.map((sig, idx) => {
                  const isLocked = !isVIP && idx > 0;
                  const isBuy = sig.type === 'BUY';
                  const isCopied = copiedSignalId === sig.id;

                  return (
                    <div
                      key={sig.id}
                      className={`relative bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between ${
                        isLocked ? 'opacity-90' : 'hover:border-[#363a45]'
                      }`}
                    >
                      {/* Top Signal Card Header */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-xs uppercase ${
                                isBuy
                                  ? 'bg-[#089981]/15 text-[#089981] border border-[#089981]/30'
                                  : 'bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30'
                              }`}
                            >
                              {sig.type}
                            </span>
                            <span className="font-mono font-bold text-white text-sm tracking-wide">
                              {sig.symbol}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded bg-[#131722] border border-[#2a2e39] font-mono text-xs font-bold text-[#089981]"
                              dir="ltr"
                            >
                              +{sig.pips > 0 ? sig.pips : 120} Pips
                            </span>
                            <span className="text-[11px] font-mono text-[#787b86]">
                              {sig.timeframe || '15m'}
                            </span>
                          </div>
                        </div>

                        {/* Strategy / Author badge */}
                        <div className="flex items-center justify-between text-xs text-[#787b86] mb-3 pb-3 border-b border-[#2a2e39]">
                          <span className="truncate max-w-[170px]">
                            {sig.author || sig.strategyName || 'MBK Pine Script Engine'}
                          </span>
                          <span className="text-[10px] text-[#089981] flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-[#089981]" />
                            {isAr ? 'موثق' : 'Verified'}
                          </span>
                        </div>

                        {/* Price Levels Matrix */}
                        <div className="grid grid-cols-2 gap-2 mb-3 font-mono text-xs">
                          <div className="bg-[#131722] p-2 rounded-xl border border-[#2a2e39]">
                            <div className="text-[10px] text-[#787b86] mb-0.5 font-sans">
                              {isAr ? 'سعر الدخول (Entry)' : 'Entry Price'}
                            </div>
                            <div className="font-bold text-white" dir="ltr">
                              {sig.entryPrice.toLocaleString()}
                            </div>
                          </div>

                          <div className="bg-[#131722] p-2 rounded-xl border border-[#2a2e39]">
                            <div className="text-[10px] text-[#787b86] mb-0.5 font-sans">
                              {isAr ? 'وقف الخسارة (SL)' : 'Stop Loss (SL)'}
                            </div>
                            <div className="font-bold text-[#f23645]" dir="ltr">
                              {sig.sl.toLocaleString()}
                            </div>
                          </div>

                          <div className="bg-[#131722] p-2 rounded-xl border border-[#2a2e39]">
                            <div className="text-[10px] text-[#787b86] mb-0.5 font-sans">
                              {isAr ? 'الهدف الأول (TP1)' : 'Target 1 (TP1)'}
                            </div>
                            <div className="font-bold text-[#089981]" dir="ltr">
                              {sig.tp1.toLocaleString()}
                            </div>
                          </div>

                          <div className="bg-[#131722] p-2 rounded-xl border border-[#2a2e39]">
                            <div className="text-[10px] text-[#787b86] mb-0.5 font-sans">
                              {isAr ? 'الهدف الثاني (TP2)' : 'Target 2 (TP2)'}
                            </div>
                            <div className="font-bold text-[#089981]" dir="ltr">
                              {sig.tp2.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Strategy Note */}
                        {sig.notesAr && (
                          <p className="text-xs text-[#787b86] line-clamp-2 leading-relaxed mb-4">
                            {sig.notesAr}
                          </p>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#2a2e39]">
                        {/* Open Chart Drawer Button */}
                        <button
                          onClick={() => handleOpenChartDrawer(sig)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] hover:border-[#363a45] text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-[#089981]" />
                          <span>{isAr ? 'عرض على الشارت' : 'Chart View'}</span>
                        </button>

                        {/* Copy Levels Button */}
                        <button
                          onClick={() => handleCopySignal(sig)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isCopied
                              ? 'bg-[#089981] text-[#131722] border-[#089981]'
                              : 'bg-white text-[#131722] hover:bg-[#d1d4dc] border-white'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isAr ? 'تم النسخ ✓' : 'Copied ✓'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{isAr ? 'نسخ المستويات' : 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Locked Overlay for Free Users */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-[#131722]/95 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10">
                          <div className="w-10 h-10 rounded-full bg-[#1e222d] border border-[#363a45] flex items-center justify-center mb-2">
                            <Lock className="w-5 h-5 text-white" />
                          </div>
                          <h4 className="text-sm font-bold text-white mb-1">
                            {isAr ? 'إشارة حصرية لأعضاء VIP' : 'Exclusive VIP Signal'}
                          </h4>
                          <p className="text-xs text-[#787b86] max-w-[220px] mb-3">
                            {isAr
                              ? 'قم بالترقية أو التفعيل المجاني عبر الوسيط الشريك لفتح جميع إشارات اليوم لحظياً.'
                              : 'Unlock all real-time signals with VIP membership or free via partner broker.'}
                          </p>
                          <button
                            onClick={onOpenPromoModal}
                            className="py-1.5 px-4 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-all cursor-pointer shadow-md"
                          >
                            {isAr ? 'تفعيل عضوية VIP ↗' : 'Unlock VIP Access ↗'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SLIDE-OVER CHART DRAWER (Collapsible, fast, uncluttered) */}
              {isChartDrawerOpen && drawerSignal && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
                  <div className="w-full max-w-4xl bg-[#1e222d] border-s border-[#2a2e39] h-full flex flex-col shadow-2xl">
                    {/* Drawer Header */}
                    <div className="p-4 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded font-mono font-bold text-xs uppercase ${
                            drawerSignal.type === 'BUY'
                              ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                              : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40'
                          }`}
                        >
                          {drawerSignal.type} {drawerSignal.symbol}
                        </span>
                        <span className="font-mono text-sm text-white font-bold" dir="ltr">
                          Entry: {drawerSignal.entryPrice} • SL: {drawerSignal.sl} • TP1: {drawerSignal.tp1}
                        </span>
                      </div>

                      <button
                        onClick={() => setIsChartDrawerOpen(false)}
                        className="py-1.5 px-3 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>{isAr ? 'إخفاء الشارت' : 'Hide Chart'}</span>
                      </button>
                    </div>

                    {/* Chart Container */}
                    <div className="flex-1 p-2 bg-[#131722]">
                      <TradingViewChart
                        symbol={drawerSignal.symbol}
                        onSymbolChange={onSelectSymbol}
                        tickers={tickers}
                        activeSignal={drawerSignal}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: 🏆 TRADERS MARKETPLACE & PRIVATE ROOMS (NEW FEATURE) */}
          {/* ======================================================== */}
          {activeTab === 'traders_hub' && (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              {/* If no trader selected: Show Directory (Sub-view A) */}
              {!selectedTraderId ? (
                <div>
                  {/* Directory Banner */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-5 h-5 text-white" />
                        <h1 className="text-xl font-bold text-white">
                          {isAr ? 'دليل نخبة المحللين والقنوات الخاصة' : 'Verified Traders & Private Channels'}
                        </h1>
                      </div>
                      <p className="text-xs text-[#787b86]">
                        {isAr
                          ? 'تصفح نخبة المحللين المعتمدين، اطلع على نتائج نقاط الشهر الماضي الموثقة، وتابع قنواتهم وغرف نقاشهم الحصرية.'
                          : 'Browse certified analysts, verify audited monthly pips, and enter private subscriber channels.'}
                      </p>
                    </div>

                    {/* Specialty Filters */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTraderFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          traderFilter === 'ALL'
                            ? 'bg-white text-[#131722] font-bold'
                            : 'bg-[#131722] text-[#787b86] hover:text-white border border-[#2a2e39]'
                        }`}
                      >
                        {isAr ? 'جميع المحللين' : 'All Analysts'}
                      </button>
                      <button
                        onClick={() => setTraderFilter('XAUUSD')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          traderFilter === 'XAUUSD'
                            ? 'bg-white text-[#131722] font-bold'
                            : 'bg-[#131722] text-[#787b86] hover:text-white border border-[#2a2e39]'
                        }`}
                      >
                        {isAr ? 'خبراء الذهب (XAUUSD)' : 'Gold Specialists'}
                      </button>
                      <button
                        onClick={() => setTraderFilter('US100')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          traderFilter === 'US100'
                            ? 'bg-white text-[#131722] font-bold'
                            : 'bg-[#131722] text-[#787b86] hover:text-white border border-[#2a2e39]'
                        }`}
                      >
                        {isAr ? 'خبراء ناسداك (US100)' : 'Nasdaq Specialists'}
                      </button>
                    </div>
                  </div>

                  {/* Traders Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tradersList
                      .filter((t) => traderFilter === 'ALL' || t.specialties.includes(traderFilter as MarketSymbol))
                      .map((trader) => {
                        const isFollowed = followedTraders.includes(trader.id);
                        const isUnlocked = unlockedTraders.includes(trader.id) || isVIP || trader.isOfficial;

                        return (
                          <div
                            key={trader.id}
                            className="bg-[#1e222d] border border-[#2a2e39] hover:border-[#363a45] rounded-2xl p-5 transition-all flex flex-col justify-between"
                          >
                            <div>
                              {/* Avatar + Info */}
                              <div className="flex items-center gap-3 mb-4">
                                <img
                                  src={trader.avatar}
                                  alt={trader.nameAr}
                                  className="w-13 h-13 rounded-2xl object-cover border border-[#363a45]"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-white text-sm">
                                      {isAr ? trader.nameAr : trader.nameEn}
                                    </h3>
                                    {trader.isOfficial && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                                        OFFICIAL
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#787b86] leading-tight mt-0.5">
                                    {isAr ? trader.specialtyAr : trader.specialtyEn}
                                  </p>
                                </div>
                              </div>

                              {/* Performance Metrics Badges (Strict Red/Green, dir="ltr") */}
                              <div className="grid grid-cols-3 gap-2 bg-[#131722] p-2.5 rounded-xl border border-[#2a2e39] mb-4 text-center font-mono">
                                <div>
                                  <div className="text-[10px] text-[#787b86] font-sans">
                                    {isAr ? 'نقاط الشهر' : 'Last Mo.'}
                                  </div>
                                  <div className="font-bold text-[#089981] text-xs" dir="ltr">
                                    +{trader.verifiedPipsMonth.toLocaleString()} Pips
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] text-[#787b86] font-sans">
                                    {isAr ? 'نسبة النجاح' : 'Win Rate'}
                                  </div>
                                  <div className="font-bold text-white text-xs" dir="ltr">
                                    {trader.winRate}%
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] text-[#787b86] font-sans">
                                    {isAr ? 'المشتركين' : 'Subs'}
                                  </div>
                                  <div className="font-bold text-white text-xs" dir="ltr">
                                    {trader.subscribersCount}
                                  </div>
                                </div>
                              </div>

                              {/* Bio Description */}
                              <p className="text-xs text-[#787b86] leading-relaxed mb-4">
                                {isAr ? trader.descriptionAr : trader.descriptionEn}
                              </p>
                            </div>

                            {/* Actions: Follow Toggle + Enter Trader Room */}
                            <div className="space-y-2 pt-3 border-t border-[#2a2e39]">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleFollowTrader(trader.id)}
                                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    isFollowed
                                      ? 'bg-[#2a2e39] text-[#089981] border border-[#089981]/40'
                                      : 'bg-[#131722] text-[#d1d4dc] hover:text-white border border-[#2a2e39]'
                                  }`}
                                >
                                  {isFollowed ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#089981]" />
                                      <span>{isAr ? 'تتابعه' : 'Following'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>{isAr ? 'متابعة' : 'Follow'}</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleEnterTraderRoom(trader)}
                                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                                    isUnlocked
                                      ? 'bg-white text-[#131722] hover:bg-[#d1d4dc]'
                                      : 'bg-[#2a2e39] text-white hover:border-white border border-[#363a45]'
                                  }`}
                                >
                                  {isUnlocked ? (
                                    <>
                                      <Unlock className="w-3.5 h-3.5 text-[#089981]" />
                                      <span>{isAr ? 'دخول القناة والغرفة الخاصة ↗' : 'Enter Trader Room ↗'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3.5 h-3.5 text-[#787b86]" />
                                      <span>{isAr ? 'فتح القناة والغرفة ($29 أو كود)' : 'Unlock Room ($29 or Code)'}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                /* Sub-view B: INSIDE UNLOCKED TRADER'S PRIVATE WORKSPACE */
                (() => {
                  const currentTrader = tradersList.find((t) => t.id === selectedTraderId);
                  const posts = (selectedTraderId && traderPosts[selectedTraderId]) || [];
                  const chats = (selectedTraderId && traderChats[selectedTraderId]) || [];

                  return (
                    <div className="space-y-4">
                      {/* Sub-view B Header with Back Button */}
                      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedTraderId(null)}
                            className="p-2 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                          >
                            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                            <span>{isAr ? 'دليل المحللين' : 'Directory'}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <img
                              src={currentTrader?.avatar}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-[#363a45]"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-white">
                                  {isAr ? currentTrader?.nameAr : currentTrader?.nameEn}
                                </h2>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                                  ROOM UNLOCKED
                                </span>
                              </div>
                              <p className="text-xs text-[#787b86]">
                                {isAr ? currentTrader?.specialtyAr : currentTrader?.specialtyEn}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Audited stats pill */}
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <div className="bg-[#131722] px-3 py-1.5 rounded-xl border border-[#2a2e39]">
                            <span className="text-[#787b86]">{isAr ? 'نقاط الشهر: ' : 'Pips: '}</span>
                            <span className="text-[#089981] font-bold" dir="ltr">
                              +{currentTrader?.verifiedPipsMonth} Pips
                            </span>
                          </div>
                          <div className="bg-[#131722] px-3 py-1.5 rounded-xl border border-[#2a2e39]">
                            <span className="text-[#787b86]">{isAr ? 'المشتركون: ' : 'Subs: '}</span>
                            <span className="text-white font-bold" dir="ltr">
                              {currentTrader?.subscribersCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2-COLUMN WORKSPACE: LEFT = SUBSCRIBER CHAT, RIGHT = EXCLUSIVE SIGNALS */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* RIGHT COLUMN (DESKTOP): EXCLUSIVE SIGNALS & ANALYSIS POSTS */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              <Radio className="w-4 h-4 text-[#089981]" />
                              <span>{isAr ? 'الإشارات والتحليلات الحصرية للمحلل' : 'Exclusive Signal Stream'}</span>
                            </h3>
                            <span className="text-xs text-[#787b86] font-mono">{posts.length} Posts</span>
                          </div>

                          {posts.map((post) => (
                            <div
                              key={post.id}
                              className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 sm:p-5 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs uppercase ${
                                      post.action === 'BUY'
                                        ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                                        : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40'
                                    }`}
                                  >
                                    {post.action}
                                  </span>
                                  <span className="font-mono font-bold text-white text-sm tracking-wide">
                                    {post.symbol}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className="px-2 py-0.5 rounded bg-[#131722] font-mono text-xs text-[#089981] font-bold border border-[#2a2e39]"
                                    dir="ltr"
                                  >
                                    +{post.pips} Pips
                                  </span>
                                  <span className="text-xs text-[#787b86]">{post.timestamp}</span>
                                </div>
                              </div>

                              <h4 className="text-sm font-bold text-white">{isAr ? post.titleAr : post.titleEn}</h4>

                              <div className="grid grid-cols-4 gap-2 bg-[#131722] p-2.5 rounded-xl border border-[#2a2e39] font-mono text-xs">
                                <div>
                                  <div className="text-[10px] text-[#787b86]">Entry</div>
                                  <div className="text-white font-bold" dir="ltr">
                                    {post.entryPrice}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-[#787b86]">TP1</div>
                                  <div className="text-[#089981] font-bold" dir="ltr">
                                    {post.tp1}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-[#787b86]">TP2</div>
                                  <div className="text-[#089981] font-bold" dir="ltr">
                                    {post.tp2}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-[#787b86]">SL</div>
                                  <div className="text-[#f23645] font-bold" dir="ltr">
                                    {post.sl}
                                  </div>
                                </div>
                              </div>

                              <p className="text-xs text-[#d1d4dc] leading-relaxed">
                                {isAr ? post.notesAr : post.notesEn}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* LEFT COLUMN: SUBSCRIBER PRIVATE DISCUSSION ROOM */}
                        <div className="lg:col-span-5 bg-[#1e222d] border border-[#2a2e39] rounded-2xl flex flex-col h-[580px]">
                          {/* Chat Header */}
                          <div className="p-3.5 bg-[#131722] border-b border-[#2a2e39] rounded-t-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-white" />
                              <h3 className="text-xs font-bold text-white">
                                {isAr ? 'غرفة نقاش مشتركي المحلل' : 'Private Subscriber Chat'}
                              </h3>
                            </div>
                            <span className="text-[10px] font-mono text-[#089981] bg-[#089981]/15 px-2 py-0.5 rounded border border-[#089981]/30">
                              SUBSCRIBERS ONLY
                            </span>
                          </div>

                          {/* Chat Message List */}
                          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto">
                            {chats.map((msg) => (
                              <div
                                key={msg.id}
                                className={`p-3 rounded-xl text-xs space-y-1 ${
                                  msg.isAnalyst
                                    ? 'bg-[#2a2e39] border border-[#363a45]'
                                    : 'bg-[#131722] border border-[#2a2e39]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white">{msg.user}</span>
                                    {msg.isAnalyst && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#089981] text-[#131722]">
                                        {isAr ? 'المحلل' : 'Analyst'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-[#787b86]">{msg.time}</span>
                                </div>
                                <p className="text-[#d1d4dc] leading-relaxed">{msg.text}</p>
                              </div>
                            ))}
                          </div>

                          {/* Chat Input */}
                          <form onSubmit={handleSendTraderChat} className="p-3 border-t border-[#2a2e39] flex gap-2">
                            <input
                              type="text"
                              value={traderChatInput}
                              onChange={(e) => setTraderChatInput(e.target.value)}
                              placeholder={
                                isAr ? 'اكتب تعليقك أو استفسارك للمحلل...' : 'Ask the analyst or discuss setups...'
                              }
                              className="flex-1 bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-white"
                            />
                            <button
                              type="submit"
                              className="py-2 px-3 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* UNLOCK TRADER MODAL (PAY $29 OR ENTER TRADER INVITE CODE) */}
              {unlockModalTrader && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <div className="relative w-full max-w-md bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 shadow-2xl text-[#d1d4dc]">
                    <button
                      onClick={() => setUnlockModalTrader(null)}
                      className="absolute top-4 left-4 rtl:left-auto rtl:right-4 text-[#787b86] hover:text-white p-1 rounded-lg hover:bg-[#2a2e39]"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="text-center mb-5">
                      <img
                        src={unlockModalTrader.avatar}
                        alt=""
                        className="w-16 h-16 rounded-2xl mx-auto object-cover border-2 border-[#363a45] mb-3"
                      />
                      <h3 className="text-lg font-bold text-white mb-1">
                        {isAr ? unlockModalTrader.nameAr : unlockModalTrader.nameEn}
                      </h3>
                      <p className="text-xs text-[#787b86]">
                        {isAr ? unlockModalTrader.specialtyAr : unlockModalTrader.specialtyEn}
                      </p>
                    </div>

                    {unlockError && (
                      <div className="mb-4 p-2.5 rounded-xl bg-[#f23645]/15 border border-[#f23645]/30 text-xs text-[#f23645] text-center">
                        {unlockError}
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Option A: Enter Invite Code given on Telegram */}
                      <div className="p-4 bg-[#131722] rounded-xl border border-[#2a2e39] space-y-2">
                        <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                          <Ticket className="w-4 h-4 text-[#089981]" />
                          <span>{isAr ? 'الدخول برمز دعوة المحلل (Trader Invite Code)' : 'Enter Trader Invite Code'}</span>
                        </label>
                        <p className="text-[11px] text-[#787b86]">
                          {isAr
                            ? 'أدخل الكود الخاص الذي تم إرساله لك بعد الدفع على تيليجرام.'
                            : 'Enter the invite code issued after confirming payment on Telegram.'}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={traderInviteCodeInput}
                            onChange={(e) => setTraderInviteCodeInput(e.target.value)}
                            placeholder="e.g. TARIQ2026 or CODE-1234"
                            className="flex-1 bg-[#1e222d] border border-[#363a45] rounded-xl px-3 py-2 text-xs font-mono text-white uppercase placeholder-[#787b86] focus:outline-none focus:border-white"
                          />
                          <button
                            onClick={() => handleUnlockTrader('CODE')}
                            className="py-2 px-4 rounded-xl bg-[#089981] hover:bg-[#089981]/80 text-[#131722] font-bold text-xs transition-colors cursor-pointer"
                          >
                            {isAr ? 'تفعيل الكود' : 'Unlock'}
                          </button>
                        </div>
                      </div>

                      <div className="relative text-center">
                        <span className="text-[10px] text-[#787b86] uppercase bg-[#1e222d] px-2">
                          {isAr ? 'أو' : 'or'}
                        </span>
                      </div>

                      {/* Option B: Direct Platform Subscription ($29/mo) */}
                      <div className="p-4 bg-[#131722] rounded-xl border border-[#2a2e39] flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">
                            {isAr ? 'اشتراك شهري مباشر عبر المنصة' : 'Direct Monthly Access'}
                          </div>
                          <div className="text-[11px] text-[#787b86]">
                            ${unlockModalTrader.monthlyPrice}/mo • {isAr ? 'إلغاء بأي وقت' : 'Cancel anytime'}
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnlockTrader('PAY')}
                          className="py-2 px-4 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer"
                        >
                          {isAr ? 'دفع $29 وتفعيل فوري' : 'Subscribe $29'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: 📈 LIVE CHART & MARKET DESK (FULL SCREEN WORKSPACE) */}
          {/* ======================================================== */}
          {activeTab === 'market_chart' && (
            <div className="h-full flex flex-col p-3 sm:p-4 space-y-3">
              {/* Clocks + Session Radar Ribbon */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#089981] animate-pulse"></span>
                  <span className="font-bold text-white text-xs">
                    {isAr ? 'جلسات التداول العالمية المفتوحة:' : 'Global Trading Sessions:'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39]">
                    <span className="w-2 h-2 rounded-full bg-[#089981]"></span>
                    <span className="text-white font-bold">London:</span>
                    <span className="text-[#089981]">ACTIVE</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39]">
                    <span className="w-2 h-2 rounded-full bg-[#089981]"></span>
                    <span className="text-white font-bold">New York:</span>
                    <span className="text-[#089981]">OVERLAP 🔥</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39]">
                    <span className="w-2 h-2 rounded-full bg-[#787b86]"></span>
                    <span className="text-[#787b86]">Tokyo: Closed</span>
                  </div>
                </div>

                {/* Quick Asset Switcher */}
                <div className="flex items-center gap-1 font-mono text-xs">
                  {(['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'] as MarketSymbol[]).map((sym) => (
                    <button
                      key={sym}
                      onClick={() => {
                        onSelectSymbol(sym);
                        soundManager.playClick();
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedSymbol === sym
                          ? 'bg-white text-[#131722]'
                          : 'bg-[#131722] text-[#787b86] hover:text-white border border-[#2a2e39]'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Height TradingView Chart Widget */}
              <div className="flex-1 min-h-[550px] bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden p-1 shadow-xl">
                <TradingViewChart
                  symbol={selectedSymbol}
                  onSymbolChange={onSelectSymbol}
                  tickers={tickers}
                  fullHeightOnMobile
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: 🤖 SMC AI AGENT & CALCULATORS (RISK & LOT AUDITOR) */}
          {/* ======================================================== */}
          {activeTab === 'ai_agent' && (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              {/* Subtabs Switcher */}
              <div className="flex items-center gap-2 p-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-fit">
                <button
                  onClick={() => setAiSubTab('chat')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    aiSubTab === 'chat' ? 'bg-white text-[#131722]' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>{isAr ? 'وكيل التحليل الذكي (SMC Agent)' : 'SMC AI Agent'}</span>
                </button>

                <button
                  onClick={() => setAiSubTab('calculator')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    aiSubTab === 'calculator' ? 'bg-white text-[#131722]' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>{isAr ? 'حاسبة حجم اللوت (Lot Sizer)' : 'Lot Size Calculator'}</span>
                </button>

                <button
                  onClick={() => setAiSubTab('auditor')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    aiSubTab === 'auditor' ? 'bg-white text-[#131722]' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>{isAr ? 'مدقق العائد للمخاطرة (R:R)' : 'R:R Auditor'}</span>
                </button>
              </div>

              {/* Subtab 1: AI Chat */}
              {aiSubTab === 'chat' && (
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl flex flex-col h-[620px] overflow-hidden">
                  <div className="p-4 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#2a2e39] flex items-center justify-center">
                        <Bot className="w-5 h-5 text-[#089981]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          MBK Smart AI Agent (Smart Money Concepts • SMC)
                        </h3>
                        <p className="text-xs text-[#787b86]">
                          {isAr
                            ? 'مدرب على قراءة السيولة، كتل الأوامر (Order Blocks)، وفجوات السعر (FVG).'
                            : 'Trained on institutional liquidity sweeps, order blocks, and FVGs.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preset prompt buttons */}
                  <div className="p-3 bg-[#131722]/50 border-b border-[#2a2e39] flex items-center gap-2 overflow-x-auto">
                    {[
                      'تحليل ناسداك US100 الآن',
                      'تحليل الذهب XAUUSD',
                      'كيف أتداول فجوة السعر FVG؟',
                      'احسب لي مخاطرة صفقة 1%'
                    ].map((promptText) => (
                      <button
                        key={promptText}
                        onClick={() => handleSendAiPrompt(promptText)}
                        className="px-3 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-medium text-[#d1d4dc] hover:text-white transition-colors cursor-pointer shrink-0"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>

                  {/* Messages container */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {aiMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 max-w-2xl ${
                          msg.role === 'user' ? 'ms-auto flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                            msg.role === 'user'
                              ? 'bg-white text-[#131722]'
                              : 'bg-[#2a2e39] text-[#089981] border border-[#363a45]'
                          }`}
                        >
                          {msg.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
                        </div>
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-white text-[#131722] font-medium'
                              : 'bg-[#131722] text-[#d1d4dc] border border-[#2a2e39]'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.text}</p>
                          <span className="block text-[10px] text-[#787b86] mt-1 font-mono">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                    {aiIsTyping && (
                      <div className="flex items-center gap-2 text-xs text-[#787b86]">
                        <Bot className="w-4 h-4 text-[#089981] animate-spin" />
                        <span>{isAr ? 'الوكيل يحلل حركة السيولة...' : 'Agent analyzing liquidity...'}</span>
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={(e) => { e.preventDefault(); handleSendAiPrompt(); }} className="p-3 border-t border-[#2a2e39] bg-[#131722] flex gap-2">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder={isAr ? 'اسأل الوكيل الذكي عن أي أصل أو تحليل هيكلي...' : 'Ask about any symbol, FVG, or risk setup...'}
                      className="flex-1 bg-[#1e222d] border border-[#2a2e39] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-white"
                    />
                    <button
                      type="submit"
                      className="py-2.5 px-5 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{isAr ? 'إرسال' : 'Send'}</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Subtab 2: Lot Size & Risk Calculator */}
              {aiSubTab === 'calculator' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inputs Card */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-[#089981]" />
                      <span>{isAr ? 'حاسبة حجم اللوت المؤسسي (Lot Sizer)' : 'Institutional Lot Sizer'}</span>
                    </h3>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'تجنب المرجنة وخرق حسابات التمويل (Prop Firms). احسب العقد الدقيق بدولار المخاطرة المحدد.'
                        : 'Guard your capital and funded prop accounts. Calculate precise contract size per trade.'}
                    </p>

                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <label className="block text-[#787b86] mb-1 font-sans">
                          {isAr ? 'رصيد الحساب ($)' : 'Account Balance ($)'}
                        </label>
                        <input
                          type="number"
                          value={calcAccountBalance}
                          onChange={(e) => setCalcAccountBalance(Number(e.target.value))}
                          className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-sans">
                          {isAr ? 'نسبة المخاطرة المرغوبة (% من الحساب)' : 'Risk Percentage (%)'}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={calcRiskPercent}
                          onChange={(e) => setCalcRiskPercent(Number(e.target.value))}
                          className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-sans">
                          {isAr ? 'مسافة وقف الخسارة (نقاط / Pips)' : 'Stop Loss Distance (Pips)'}
                        </label>
                        <input
                          type="number"
                          value={calcStopLossPips}
                          onChange={(e) => setCalcStopLossPips(Number(e.target.value))}
                          className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Results Card */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#787b86] mb-4">
                        {isAr ? 'نتيجة الحساب الموصى بها:' : 'Calculation Output:'}
                      </h4>

                      <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl p-6 text-center space-y-2 mb-4">
                        <div className="text-xs text-[#787b86]">{isAr ? 'حجم اللوت الموصى به' : 'Recommended Lot Size'}</div>
                        <div className="text-4xl font-mono font-bold text-[#089981]" dir="ltr">
                          {calculatedLotSize} Lot
                        </div>
                        <div className="text-xs text-[#787b86] font-mono">
                          {calcSymbol} • {calcRiskPercent}% Risk
                        </div>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between p-2.5 bg-[#131722] rounded-xl border border-[#2a2e39]">
                          <span className="text-[#787b86] font-sans">{isAr ? 'المبلغ المعرض للمخاطرة:' : 'Total $ at Risk:'}</span>
                          <span className="text-[#f23645] font-bold" dir="ltr">
                            -${lotRiskDollars.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between p-2.5 bg-[#131722] rounded-xl border border-[#2a2e39]">
                          <span className="text-[#787b86] font-sans">{isAr ? 'قيمة النقطة الواحدة (Pip Value):' : 'Pip Value:'}</span>
                          <span className="text-white font-bold" dir="ltr">
                            ${lotPipValue.toFixed(2)}/pip
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-[#089981]/10 border border-[#089981]/30 text-xs text-[#089981] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{isAr ? 'متوافق مع قواعد شركات التمويل والتراجع اليومي 100%' : '100% Prop Firm Risk Compliant'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtab 3: R:R Trade Auditor */}
              {aiSubTab === 'auditor' && (
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 max-w-2xl mx-auto space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                      <Target className="w-5 h-5 text-white" />
                      <span>{isAr ? 'مدقق معدل العائد للمخاطرة (Risk to Reward Ratio)' : 'Risk to Reward Auditor'}</span>
                    </h3>
                    <p className="text-xs text-[#787b86]">
                      {isAr
                        ? 'تأكد من أن صفقاتك تحقق على الأقل 1:2 قبل الدخول لضمان ربحية المحفظة حتى بنسبة نجاح 40%.'
                        : 'Ensure your trades maintain at least 1:2 R:R to guarantee long-term edge.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                    <div>
                      <label className="block text-[#787b86] mb-1 font-sans">{isAr ? 'الدخول (Entry)' : 'Entry'}</label>
                      <input
                        type="number"
                        value={auditorEntry}
                        onChange={(e) => setAuditorEntry(Number(e.target.value))}
                        className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[#787b86] mb-1 font-sans">{isAr ? 'الهدف (TP)' : 'Target'}</label>
                      <input
                        type="number"
                        value={auditorTp}
                        onChange={(e) => setAuditorTp(Number(e.target.value))}
                        className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-[#089981] font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[#787b86] mb-1 font-sans">{isAr ? 'الوقف (SL)' : 'Stop'}</label>
                      <input
                        type="number"
                        value={auditorSl}
                        onChange={(e) => setAuditorSl(Number(e.target.value))}
                        className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-[#f23645] font-bold"
                      />
                    </div>
                  </div>

                  <div className="bg-[#131722] p-5 rounded-2xl border border-[#2a2e39] text-center space-y-2">
                    <div className="text-xs text-[#787b86]">{isAr ? 'معدل العائد للمخاطرة المحسوب' : 'Calculated R:R Ratio'}</div>
                    <div className="text-3xl font-mono font-bold text-white" dir="ltr">
                      1 : {calculatedRrRatio}
                    </div>
                    <div className="text-xs text-[#787b86] font-mono">
                      {isAr ? 'نسبة الفوز المطلوبة للتعادل: ' : 'Breakeven Win Rate: '}
                      <span className="text-[#089981] font-bold" dir="ltr">{breakevenWinRate}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: 📓 SMART JOURNAL & HABIT DETECTIVE (PSYCHOLOGY) */}
          {/* ======================================================== */}
          {activeTab === 'journal' && (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5">
                <div>
                  <h1 className="text-xl font-bold text-white mb-1">
                    {isAr ? 'مفكرة التداول وكاشف العادات النفسية' : 'Smart Journal & Psychology Detective'}
                  </h1>
                  <p className="text-xs text-[#787b86]">
                    {isAr
                      ? 'الفرق بين الصفقات الملتزمة بالخطة وصفقات التسرع والانتقام (FOMO & Revenge Trading).'
                      : 'Compare disciplined execution PnL against emotional FOMO costs.'}
                  </p>
                </div>

                <button
                  onClick={() => setIsNewJournalOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'توثيق صفقة جديدة' : 'Log New Trade'}</span>
                </button>
              </div>

              {/* Psychology Metrics Scorecards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4">
                  <div className="text-xs text-[#787b86] mb-1">{isAr ? 'أرباح الصفقات المنضبطة' : 'Disciplined PnL'}</div>
                  <div className="text-2xl font-mono font-bold text-[#089981]" dir="ltr">
                    +${disciplinedPnl.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#787b86] mt-1">{disciplinedTrades.length} {isAr ? 'صفقات بخطة مسبقة' : 'planned trades'}</div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4">
                  <div className="text-xs text-[#787b86] mb-1">{isAr ? 'تكلفة التسرع والانتقام (FOMO)' : 'Emotional FOMO Cost'}</div>
                  <div className="text-2xl font-mono font-bold text-[#f23645]" dir="ltr">
                    -${emotionalCost.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#787b86] mt-1">{emotionalTrades.length} {isAr ? 'صفقات عاطفية' : 'emotional trades'}</div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4">
                  <div className="text-xs text-[#787b86] mb-1">{isAr ? 'معدل الانضباط النفسي' : 'Discipline Score'}</div>
                  <div className="text-2xl font-mono font-bold text-white" dir="ltr">
                    {disciplineScore}%
                  </div>
                  <div className="text-[11px] text-[#089981] mt-1">{isAr ? 'مؤشر أداء ممتاز' : 'Target > 80%'}</div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4">
                  <div className="text-xs text-[#787b86] mb-1">{isAr ? 'الصافي الحقيقي الحالي' : 'Net Current PnL'}</div>
                  <div
                    className={`text-2xl font-mono font-bold ${
                      totalJournalPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                    }`}
                    dir="ltr"
                  >
                    {totalJournalPnl >= 0 ? `+$${totalJournalPnl}` : `-$${Math.abs(totalJournalPnl)}`}
                  </div>
                  <div className="text-[11px] text-[#787b86] mt-1">
                    {isAr ? 'لو توقفت عن FOMO لكنت +' : 'Without FOMO: +'}${potentialDisciplinedPnl}
                  </div>
                </div>
              </div>

              {/* Journal Entries Table */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden">
                <div className="p-4 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{isAr ? 'سجل الصفقات الموثقة' : 'Logged Trade History'}</h3>
                  <span className="text-xs font-mono text-[#787b86]">{journalEntries.length} Records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[#2a2e39] text-[#787b86] font-medium bg-[#131722]/50">
                        <th className="py-3 px-4">التاريخ</th>
                        <th className="py-3 px-3">الأصل</th>
                        <th className="py-3 px-3">النوع</th>
                        <th className="py-3 px-3">الدخول</th>
                        <th className="py-3 px-3">الخروج</th>
                        <th className="py-3 px-3">النتيجة ($)</th>
                        <th className="py-3 px-3">الحالة النفسية والتنفيذ</th>
                        <th className="py-3 px-4">الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39] font-mono">
                      {journalEntries.map((j) => (
                        <tr key={j.id} className="hover:bg-[#2a2e39]/50 transition-colors">
                          <td className="py-3 px-4 text-[#787b86] font-sans">{j.date}</td>
                          <td className="py-3 px-3 font-bold text-white">{j.symbol}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                j.type === 'BUY'
                                  ? 'bg-[#089981]/15 text-[#089981]'
                                  : 'bg-[#f23645]/15 text-[#f23645]'
                              }`}
                            >
                              {j.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-white" dir="ltr">{j.entry}</td>
                          <td className="py-3 px-3 text-white" dir="ltr">{j.exit}</td>
                          <td
                            className={`py-3 px-3 font-bold ${
                              j.pnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                            }`}
                            dir="ltr"
                          >
                            {j.pnl >= 0 ? `+$${j.pnl}` : `-$${Math.abs(j.pnl)}`}
                          </td>
                          <td className="py-3 px-3 font-sans">
                            {j.mindset === 'DISCIPLINED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                                منضبط بخطة ✓
                              </span>
                            )}
                            {j.mindset === 'FOMO' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30">
                                تسرع (FOMO) ⚠️
                              </span>
                            )}
                            {j.mindset === 'REVENGE' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30">
                                تداول انتقامي ⚠️
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#787b86] font-sans max-w-xs truncate">{j.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal: Log New Trade */}
              {isNewJournalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <div className="relative w-full max-w-md bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 shadow-2xl text-[#d1d4dc]">
                    <button
                      onClick={() => setIsNewJournalOpen(false)}
                      className="absolute top-4 left-4 rtl:left-auto rtl:right-4 text-[#787b86] hover:text-white p-1 rounded-lg hover:bg-[#2a2e39]"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <h3 className="text-base font-bold text-white mb-4">
                      {isAr ? 'توثيق صفقة في اليوميات' : 'Log New Trade in Journal'}
                    </h3>

                    <form onSubmit={handleAddJournalEntry} className="space-y-3 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">الأصل (Symbol)</label>
                          <select
                            value={newJournalSymbol}
                            onChange={(e) => setNewJournalSymbol(e.target.value as MarketSymbol)}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white"
                          >
                            <option value="US100">US100</option>
                            <option value="XAUUSD">XAUUSD</option>
                            <option value="EURUSD">EURUSD</option>
                            <option value="BTCUSD">BTCUSD</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">نوع الصفقة</label>
                          <select
                            value={newJournalType}
                            onChange={(e) => setNewJournalType(e.target.value as 'BUY' | 'SELL')}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white"
                          >
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">سعر الدخول</label>
                          <input
                            type="number"
                            value={newJournalEntryPrice}
                            onChange={(e) => setNewJournalEntryPrice(Number(e.target.value))}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2.5 py-2 text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">سعر الخروج</label>
                          <input
                            type="number"
                            value={newJournalExitPrice}
                            onChange={(e) => setNewJournalExitPrice(Number(e.target.value))}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2.5 py-2 text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">الربح/الخسارة ($)</label>
                          <input
                            type="number"
                            value={newJournalPnl}
                            onChange={(e) => setNewJournalPnl(Number(e.target.value))}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2.5 py-2 text-white font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-sans">الحالة النفسية عند الدخول والخروج</label>
                        <select
                          value={newJournalMindset}
                          onChange={(e) => setNewJournalMindset(e.target.value as any)}
                          className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-sans"
                        >
                          <option value="DISCIPLINED">منضبط ومطابق لخطة التداول بنسبة 100%</option>
                          <option value="FOMO">تسرع أو خوف من فوات الفرصة (FOMO)</option>
                          <option value="REVENGE">تداول انتقامي لتعويض خسارة سابقة</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-sans">ملاحظات التحليل والدرس المستفاد</label>
                        <textarea
                          rows={2}
                          value={newJournalNotes}
                          onChange={(e) => setNewJournalNotes(e.target.value)}
                          placeholder="ماذا تعلمت من هذه الصفقة؟"
                          className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-sans"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-white text-[#131722] font-bold text-xs hover:bg-[#d1d4dc] transition-colors cursor-pointer font-sans"
                      >
                        حفظ الصفقة في اليوميات ↗
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: 📅 ECONOMIC CALENDAR & MACRO RADAR */}
          {/* ======================================================== */}
          {activeTab === 'economic_calendar' && (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-white" />
                  <h1 className="text-xl font-bold text-white">
                    {isAr ? 'الأجندة الاقتصادية ورادار السيولة الكلية (Macro Radar)' : 'High Impact Economic Calendar'}
                  </h1>
                </div>
                <p className="text-xs text-[#787b86]">
                  {isAr
                    ? 'البيانات الاقتصادية الأشد تأثيراً على ناسداك والذهب والعملات (معدلات التضخم CPI، مؤشر الوظائف NFP، وقرارات الفائدة FOMC).'
                    : 'Institutional macro calendar covering US CPI, NFP, and FOMC rate decisions.'}
                </p>
              </div>

              {/* High Impact Radar Countdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">US CPI Inflation</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30">
                      HIGH IMPACT 🔥
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1" dir="ltr">
                    3d 14h 22m
                  </div>
                  <div className="text-[11px] text-[#787b86] font-sans">
                    {isAr ? 'توقع استقرار التضخم عند 2.8% سنوياً' : 'Forecast: 2.8% YoY'}
                  </div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">FOMC Rate Decision</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30">
                      ULTRA HIGH 🔥
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1" dir="ltr">
                    12d 08h 15m
                  </div>
                  <div className="text-[11px] text-[#787b86] font-sans">
                    {isAr ? 'توقع تثبيت الفائدة عند 4.75%' : 'Forecast: Hold 4.75%'}
                  </div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">US NFP Employment</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30">
                      HIGH IMPACT 🔥
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1" dir="ltr">
                    18d 03h 40m
                  </div>
                  <div className="text-[11px] text-[#787b86] font-sans">
                    {isAr ? 'توقع إضافة 175 ألف وظيفة' : 'Forecast: 175k jobs'}
                  </div>
                </div>
              </div>

              {/* Calendar Events Table */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[#2a2e39] text-[#787b86] font-medium bg-[#131722]/50">
                        <th className="py-3 px-4">الحدث الاقتصادي</th>
                        <th className="py-3 px-3">العملة</th>
                        <th className="py-3 px-3">التوقيت</th>
                        <th className="py-3 px-3">مستوى التأثير</th>
                        <th className="py-3 px-3">التقديري</th>
                        <th className="py-3 px-3">السابق</th>
                        <th className="py-3 px-4">الفعلي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39] font-mono">
                      {economicEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-[#2a2e39]/50 transition-colors">
                          <td className="py-3 px-4 text-white font-sans font-bold">{ev.titleAr}</td>
                          <td className="py-3 px-3 text-white font-bold">{ev.currency}</td>
                          <td className="py-3 px-3 text-[#787b86] font-sans">{ev.timeAr}</td>
                          <td className="py-3 px-3 font-sans">
                            {ev.impact === 'HIGH' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30">
                                عالي التأثير 🔥
                              </span>
                            )}
                            {ev.impact === 'MEDIUM' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-[#363a45]">
                                متوسط
                              </span>
                            )}
                            {ev.impact === 'LOW' && (
                              <span className="px-2 py-0.5 rounded text-[10px] text-[#787b86]">
                                منخفض
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[#d1d4dc]" dir="ltr">{ev.forecast}</td>
                          <td className="py-3 px-3 text-[#787b86]" dir="ltr">{ev.previous}</td>
                          <td className="py-3 px-4 text-[#089981] font-bold" dir="ltr">{ev.actual || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: ⚙️ CEO & ANALYST COMMAND CENTER (PIN PROTECTED) */}
          {/* ======================================================== */}
          {activeTab === 'admin_center' && (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              {!isAdminUnlocked ? (
                /* PIN ENTRY CARD */
                <div className="max-w-md mx-auto bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 sm:p-8 text-center my-12 shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-[#131722] border border-[#363a45] flex items-center justify-center mx-auto mb-4 text-white">
                    <Lock className="w-7 h-7 text-[#089981]" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {isAr ? 'لوحة إدارة المنصة والمحللين (CEO Command)' : 'CEO & Admin Command Center'}
                  </h2>
                  <p className="text-xs text-[#787b86] mb-6">
                    {isAr
                      ? 'هذه المنطقة مخصصة للإدارة فقط لنشر الإشارات وتوليد أكواد الدعوة للمشتركين. يرجى إدخال رمز PIN السري.'
                      : 'Restricted area for CEO & admins. Enter the 4-digit PIN (2026) to proceed.'}
                  </p>

                  <form onSubmit={handleVerifyAdminPin} className="space-y-4">
                    <div>
                      <input
                        type="password"
                        maxLength={6}
                        value={adminPinInput}
                        onChange={(e) => {
                          setAdminPinInput(e.target.value);
                          setAdminPinError(false);
                        }}
                        placeholder="••••"
                        className="w-48 mx-auto text-center font-mono text-2xl tracking-[0.5em] bg-[#131722] border border-[#2a2e39] rounded-xl py-3 text-white focus:outline-none focus:border-white"
                      />
                    </div>

                    {adminPinError && (
                      <div className="text-xs text-[#f23645]">
                        {isAr ? 'رمز PIN غير صحيح. جرب 2026.' : 'Incorrect PIN. Try 2026.'}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isAr ? 'فتح لوحة الإدارة ↗' : 'Unlock Admin Desk ↗'}
                    </button>
                  </form>
                </div>
              ) : (
                /* UNLOCKED CEO WORKSPACE */
                <div className="space-y-6">
                  {/* Toast for created code */}
                  {createdCodeToast && (
                    <div className="p-3 bg-[#089981]/20 border border-[#089981] rounded-xl text-xs text-[#089981] flex items-center justify-between font-mono">
                      <span>{isAr ? 'تم توليد ونسخ الكود بنجاح:' : 'Code generated & copied:'} <strong>{createdCodeToast}</strong></span>
                      <span className="text-[11px] font-sans text-white">{isAr ? 'جاهز للإرسال على تيليجرام' : 'Ready for Telegram'}</span>
                    </div>
                  )}

                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-[#089981]" />
                        <h2 className="text-lg font-bold text-white">
                          {isAr ? 'لوحة تحكم المدير التنفيذي والمحللين' : 'CEO Operations & Code Generator'}
                        </h2>
                      </div>
                      <p className="text-xs text-[#787b86]">
                        {isAr
                          ? 'نشر الإشارات للمنصة، توليد أكواد الاشتراك المدفوع للعملاء، وإضافة محللين شركاء.'
                          : 'Publish live signals, mint VIP & analyst invite codes, and manage traders.'}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAdminUnlocked(false)}
                      className="py-1.5 px-3 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs text-[#787b86] hover:text-white cursor-pointer"
                    >
                      {isAr ? 'قفل اللوحة' : 'Lock Desk'}
                    </button>
                  </div>

                  {/* 3 Main Action Modules */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* MODULE 1: Generate VIP & Trader Invite Codes */}
                    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-[#089981]" />
                          <span>{isAr ? 'توليد أكواد اشتراك VIP ومحللين' : 'VIP & Trader Code Generator'}</span>
                        </h3>
                        <span className="text-[10px] text-[#787b86] font-mono">TELEGRAM READY</span>
                      </div>
                      <p className="text-xs text-[#787b86]">
                        {isAr
                          ? 'استخدم هذه الأداة بعد استلام الدفع من العميل على تيليجرام لتوليد كود تفعيل فوري له.'
                          : 'Generate instant unlock codes to send to customers who pay on Telegram.'}
                      </p>

                      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">نوع الكود</label>
                          <select
                            value={newCodeType}
                            onChange={(e) => setNewCodeType(e.target.value as 'VIP' | 'TRADER')}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-sans"
                          >
                            <option value="VIP">عضوية VIP للمنصة كاملة</option>
                            <option value="TRADER">غرفة محلل شريك محدد</option>
                          </select>
                        </div>

                        {newCodeType === 'TRADER' && (
                          <div>
                            <label className="block text-[#787b86] mb-1 font-sans">اختر المحلل</label>
                            <select
                              value={newCodeTraderId}
                              onChange={(e) => setNewCodeTraderId(e.target.value)}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-sans"
                            >
                              {tradersList.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nameAr}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleGenerateNewCode}
                        className="w-full py-2.5 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAr ? 'توليد رمز جديد ونسخه للحافظة ↗' : 'Generate & Copy New Code ↗'}</span>
                      </button>

                      {/* List of active codes */}
                      <div className="space-y-2 pt-2">
                        <div className="text-[11px] text-[#787b86] font-sans font-bold">الأكواد الصادرة مؤخراً:</div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {generatedCodes.map((gc) => (
                            <div
                              key={gc.code}
                              className="p-2.5 bg-[#131722] rounded-xl border border-[#2a2e39] flex items-center justify-between text-xs font-mono"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#089981]">{gc.code}</span>
                                <span className="text-[10px] text-[#787b86] font-sans">({gc.type})</span>
                              </div>

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(gc.code);
                                  setCreatedCodeToast(gc.code);
                                  setTimeout(() => setCreatedCodeToast(null), 2500);
                                }}
                                className="px-2 py-1 rounded bg-[#2a2e39] hover:bg-[#363a45] text-[10px] text-white flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>نسخ</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* MODULE 2: Publish a New Live Signal */}
                    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Radio className="w-4 h-4 text-[#089981]" />
                          <span>{isAr ? 'نشر إشارة جديدة على المنصة' : 'Publish Live Signal'}</span>
                        </h3>
                        {pubSuccess && (
                          <span className="text-xs text-[#089981] font-bold">تم نشر الإشارة بنجاح! ✓</span>
                        )}
                      </div>

                      <form onSubmit={handlePublishSignalFromAdmin} className="space-y-3 font-mono text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[#787b86] mb-1 font-sans">المحلل / الحساب</label>
                            <select
                              value={pubTraderId}
                              onChange={(e) => setPubTraderId(e.target.value)}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2 py-2 text-white font-sans"
                            >
                              {tradersList.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nameAr}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[#787b86] mb-1 font-sans">الأصل</label>
                            <select
                              value={pubSymbol}
                              onChange={(e) => setPubSymbol(e.target.value as MarketSymbol)}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2 py-2 text-white"
                            >
                              <option value="US100">US100</option>
                              <option value="XAUUSD">XAUUSD</option>
                              <option value="EURUSD">EURUSD</option>
                              <option value="BTCUSD">BTCUSD</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[#787b86] mb-1 font-sans">الاتجاه</label>
                            <select
                              value={pubAction}
                              onChange={(e) => setPubAction(e.target.value as 'BUY' | 'SELL')}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2 py-2 text-white font-bold"
                            >
                              <option value="BUY">BUY</option>
                              <option value="SELL">SELL</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[#787b86] mb-1 font-sans">الدخول</label>
                            <input
                              type="number"
                              value={pubEntry}
                              onChange={(e) => setPubEntry(Number(e.target.value))}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2 py-2 text-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[#787b86] mb-1 font-sans">TP1</label>
                            <input
                              type="number"
                              value={pubTp1}
                              onChange={(e) => setPubTp1(Number(e.target.value))}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2 py-2 text-[#089981] font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[#787b86] mb-1 font-sans">TP2</label>
                            <input
                              type="number"
                              value={pubTp2}
                              onChange={(e) => setPubTp2(Number(e.target.value))}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2 py-2 text-[#089981] font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[#787b86] mb-1 font-sans">SL</label>
                            <input
                              type="number"
                              value={pubSl}
                              onChange={(e) => setPubSl(Number(e.target.value))}
                              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-2 py-2 text-[#f23645] font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">سبب الدخول والاستراتيجية</label>
                          <input
                            type="text"
                            value={pubNotes}
                            onChange={(e) => setPubNotes(e.target.value)}
                            placeholder="مثال: كسر قاع لندن وتأكيد فريم 15m..."
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-sans"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer font-sans"
                        >
                          نشر الإشارة على المنصة فوراً ↗
                        </button>
                      </form>
                    </div>

                    {/* MODULE 3: Add Partner Trader Profile */}
                    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 space-y-4 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Users className="w-4 h-4 text-white" />
                          <span>{isAr ? 'إضافة محلل شريك جديد إلى دليل المنصة' : 'Add Partner Analyst to Directory'}</span>
                        </h3>
                        {traderAddedSuccess && (
                          <span className="text-xs text-[#089981] font-bold">تمت إضافة المحلل للدليل! ✓</span>
                        )}
                      </div>

                      <form onSubmit={handleAddNewTrader} className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">اسم المحلل</label>
                          <input
                            type="text"
                            required
                            value={newTraderName}
                            onChange={(e) => setNewTraderName(e.target.value)}
                            placeholder="مثال: المهندس وسام — خبير البتكوين"
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-sans"
                          />
                        </div>

                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">التخصص والوصف</label>
                          <input
                            type="text"
                            value={newTraderSpecialty}
                            onChange={(e) => setNewTraderSpecialty(e.target.value)}
                            placeholder="مضاربة العملات الرقمية وUSDT"
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-sans"
                          />
                        </div>

                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">رمز الدعوة المخصص له</label>
                          <input
                            type="text"
                            value={newTraderInvite}
                            onChange={(e) => setNewTraderInvite(e.target.value)}
                            placeholder="e.g. WESAM2026"
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white uppercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">نقاط الشهر الموثقة (Pips)</label>
                          <input
                            type="number"
                            value={newTraderPips}
                            onChange={(e) => setNewTraderPips(Number(e.target.value))}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-[#089981] font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">نسبة النجاح (% Win Rate)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newTraderWinRate}
                            onChange={(e) => setNewTraderWinRate(Number(e.target.value))}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[#787b86] mb-1 font-sans">سعر الاشتراك الشهري ($/mo)</label>
                          <input
                            type="number"
                            value={newTraderPrice}
                            onChange={(e) => setNewTraderPrice(Number(e.target.value))}
                            className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-white font-bold"
                          />
                        </div>

                        <div className="md:col-span-3 pt-2">
                          <button
                            type="submit"
                            className="w-full py-2.5 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer font-sans"
                          >
                            إدراج المحلل في دليل المنصة فوراً ↗
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
