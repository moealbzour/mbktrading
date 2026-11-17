export interface UserProfile {
  uid?: string;
  id?: string;
  username?: string;
  name: string;
  email: string;
  role: 'FREE' | 'VIP' | 'ELITE' | 'ADMIN' | 'STANDARD' | 'ANALYSER' | 'MODERATOR' | 'SALES' | string;
  tier?: 'free' | 'vip' | 'elite';
  promoCode?: string;
  planName: string;
  avatar?: string;
  isAdmin?: boolean;
  isStaff?: boolean;
  subscriptionStatus?: 'active' | 'expired' | 'none';
  subscriptionEndDate?: string | null;
  telegramUsername?: string;
  unlockedTraders?: string[];
  followedTraders?: string[];
  isEmailVerified?: boolean;
  needsOnboarding?: boolean;
  phone?: string;
  country?: string;
  dob?: string;
  experienceLevel?: string;
  assetClasses?: string[];
  favoritePairs?: string;
  totalPaid?: number;
  isBanned?: boolean;
  isMutedFromChat?: boolean;
  lastActiveAt?: string;
  isVip?: boolean;
  vipAccess?: boolean;
  vipExpiryDate?: string | null;
  isElite?: boolean;
  eliteExpiryDate?: string | null;
  grantedFeatures?: Record<string, string>;
  activationKey?: string | null;
}

export interface TraderProfile {
  id: string;
  nameAr: string;
  nameEn: string;
  specialtyAr: string;
  specialtyEn: string;
  roleAr: string;
  roleEn: string;
  avatar: string;
  verifiedPipsMonth: number;
  winRate: number;
  subscribersCount: number;
  isOfficial?: boolean;
  specialties: MarketSymbol[];
  monthlyPrice: number;
  inviteCode: string;
  descriptionAr: string;
  descriptionEn: string;
  signalsCount: number;
}

export interface TraderPost {
  id: string;
  traderId: string;
  traderName: string;
  traderAvatar: string;
  titleAr: string;
  titleEn: string;
  symbol: MarketSymbol;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  tp1: number;
  tp2: number;
  sl: number;
  pips: number;
  status: SignalStatus;
  chartImage?: string;
  notesAr: string;
  notesEn: string;
  timestamp: string;
  likes: number;
}

export type MarketSymbol = 'US100' | 'XAUUSD' | 'EURUSD' | 'BTCUSD' | 'WTI' | 'GBPUSD';

export type NewsImpact = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RSSNewsItem {
  id: string;
  title: string;
  titleAr?: string;
  link: string;
  pubDate: string;
  timeAgo: string;
  timeAgoAr?: string;
  source: string;
  category: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impact: NewsImpact;
  impactLabelAr: string;
  impactLabelEn: string;
  impactScore: 1 | 2 | 3;
}

export interface MarketTicker {
  symbol: MarketSymbol;
  nameAr: string;
  price: number;
  changePercent: number;
  changeValue: number;
  high: number;
  low: number;
  spread: number;
  digits: number;
  isUp: boolean;
  category: 'INDICES' | 'COMMODITIES' | 'FOREX' | 'CRYPTO';
}

export type SignalType = 'BUY' | 'SELL';
export type ManualSignalAction = 'BUY' | 'SELL' | 'BUY LIMIT' | 'SELL LIMIT';
export type SignalStatus = 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'CLOSED';
export type RiskLevel = 'Low' | 'Medium' | 'High';

// TAB 1: Real-time automated algorithmic alert (Firestore collection `engine_alerts`)
export interface EngineAlert {
  id: string;
  symbol: MarketSymbol;
  action: 'BUY' | 'SELL';
  entry: number;
  tp1?: number;
  tp2?: number;
  sl?: number;
  timeframe: string;
  strategyName: string;
  status: SignalStatus;
  pips: number;
  confidence: number;
  createdAt: string;
  timestamp?: any;
  verifiedWebhook?: boolean;
}

// TAB 2: Human-made manual trade (Firestore collection `manual_signals`)
export interface ManualSignal {
  id: string;
  symbol: MarketSymbol;
  action: ManualSignalAction;
  entryPrice: number;
  tp1: number;
  tp2: number;
  sl: number;
  riskLevel: RiskLevel;
  riskReward: string;
  rationale: string;
  status: SignalStatus;
  author: string;
  timeframe?: string;
  pips: number;
  createdAt: string;
  timestamp?: any;
}

export interface TradeSignal {
  id: string;
  symbol: MarketSymbol;
  type: SignalType;
  entryPrice: number;
  tp1: number;
  tp2: number;
  sl: number;
  currentPrice: number;
  pips: number;
  status: SignalStatus;
  riskReward: string;
  timeframe: string;
  confidence: number;
  strategyName: string;
  createdAt: string;
  verifiedWebhook: boolean;
  notesAr: string;
  channel?: 'ENGINE' | 'MANUAL';
  riskLevel?: RiskLevel;
  author?: string;
  accessLevel?: 'free' | 'vip' | 'all';
}

export interface MarketAnalysis {
  id: string;
  title: string;
  titleAr?: string;
  symbol: MarketSymbol | string;
  author: string;
  authorRole?: string;
  authorAvatar?: string;
  content: string;
  contentAr?: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  targetPrice?: number;
  stopLevel?: number;
  chartUrl?: string;
  accessLevel: 'free' | 'vip' | 'all';
  createdAt: string;
  likes?: number;
}

export type TradeSource = 'BOT_WEBHOOK' | 'VIP_MANUAL' | 'FREE_PUBLIC';
export type DailyTradeStatus = 'RUNNING' | 'TP_HIT' | 'SL_HIT' | 'BREAKEVEN';

export interface DailyTrade {
  id: string;
  symbol: string;
  nameAr: string;
  action: 'BUY' | 'SELL';
  source: TradeSource;
  sourceLabelAr: string;
  sourceLabelEn: string;
  status: DailyTradeStatus;
  statusLabelAr: string;
  openTime: string;
  closeTime?: string;
  duration?: string;
  pips: number; // Net pips gained or lost
  entryPrice: number; // Hidden for free users
  exitPrice?: number; // Shown when closed or hidden
  currentPrice?: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl: number; // Hidden for free users
  riskReward: string;
  strategy: string;
  confidence: number;
  notesAr?: string;
  textMsg?: string;
  isBotSignal?: boolean;
  isBlurredForFree: boolean; // Blurs entire card if running for free users
  accessLevel?: 'free' | 'vip' | 'all';
  originCollection?: 'signals' | 'bot_alerts';
  timestampMs?: number;
}

export interface DailyTradesStats {
  totalTrades: number;
  runningTrades: number;
  closedTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  netPips: number;
  grossGainPips: number;
  grossLossPips: number;
  botNetPips: number;
  vipNetPips: number;
  freeNetPips: number;
}

export type BotStrategy = 
  | 'SCALPING_NASDAQ'
  | 'GOLD_TREND_RIDER'
  | 'LONDON_BREAKOUT'
  | 'MBK_ALLIGATOR_FLOW';

export interface BotState {
  isRunning: boolean;
  selectedStrategy: BotStrategy;
  riskPercentage: number;
  tradeLimit: number;
  tp1Ratio: number;
  tp2Ratio: number;
  stopLossPoints: number;
  trailingStopActive: boolean;
  todayPnL: number;
  winRate: number;
  totalTradesToday: number;
  successfulTrades: number;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING';
  mt5Server: string;
  accountBalance: number;
  equity: number;
}

export interface BotLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'TRADE' | 'ALERT' | 'SUCCESS';
  message: string;
}

export interface CopyTradingMaster {
  name: string;
  title: string;
  allTimeGain: string;
  monthlyGain: string;
  winRate: number;
  totalCopiers: number;
  currentDrawdown: string;
  profitSharePercent: number;
  minCapital: number;
  recommendedCapital: number;
  isSynced: boolean;
  copierMultiplier: number;
  managedEquity: string;
}

export interface MBKIndicator {
  id: string;
  name: string;
  nameAr: string;
  version: string;
  badge: string;
  rating: number;
  reviewCount: number;
  priceUsd: number;
  partnerBrokerFree: boolean;
  summaryAr: string;
  featuresAr: string[];
  pineScriptSnippet: string;
  compatiblePlatforms: string[];
}

export interface AISessionReport {
  sessionId: 'asia' | 'london' | 'ny';
  sessionNameAr: string;
  sessionTimeUtc: string;
  lastUpdated: string;
  us100: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    pivot: number;
    resistance: number[];
    support: number[];
    catalystsAr: string[];
    actionPlanAr: string;
  };
  gold: {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    pivot: number;
    resistance: number[];
    support: number[];
    catalystsAr: string[];
    actionPlanAr: string;
  };
  macroSummaryAr: string;
}

export interface TechnicalBreakdown {
  id: string;
  titleAr: string;
  symbol: MarketSymbol;
  timeframe: string;
  author: string;
  publishedAt: string;
  coverImage: string;
  direction: 'BULLISH' | 'BEARISH';
  keyZonesAr: { name: string; price: string; role: string }[];
  summaryAr: string;
  targetPrice: number;
  invalidationLevel: number;
}

export interface ChatMessage {
  id: string;
  sender: {
    name: string;
    roleAr: string;
    badge: 'FOUNDER' | 'VIP_PRO' | 'SCALPER' | 'MEMBER';
    avatar: string;
  };
  content: string;
  timestamp: string;
  signalAttachment?: {
    symbol: MarketSymbol;
    type: SignalType;
    pips: string;
  };
  likes: number;
  isLikedByMe?: boolean;
}

export interface EconomicNewsItem {
  id: string;
  titleAr: string;
  titleEn?: string;
  country: string;
  countryAr?: string;
  countryEn?: string;
  currency: string;
  timeAr: string;
  timeEn?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual?: string;
  forecast: string;
  previous: string;
}

// TIC Lab & Playbooks Types
export interface BacktestLog {
  id: string;
  symbol: MarketSymbol | string;
  playbookTitle: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  outcome: 'WIN' | 'LOSS' | 'BE' | 'BREAKEVEN';
  rMultiple: number;
  notes: string;
  date: string;
}

export interface PaperPosition {
  id: string;
  symbol: MarketSymbol;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  lotSize: number;
  stopLoss: number;
  takeProfit: number;
  openTime: string;
  floatingPnL: number;
}

export interface PlaybookItem {
  id: string;
  title: string;
  titleAr: string;
  category: string;
  timeframe: string;
  recommendedSessions: string[];
  descriptionAr: string;
  checklist: string[];
  invalidationRules: string[];
  takeProfitRules: string[];
  winRate?: number;
  avgRR?: string;
  avgRiskReward?: string;
  tradesSample?: number;
  tradesCount?: number;
  badge?: string;
  isBuiltIn?: boolean;
}

export type TradeEmotion = 'DISCIPLINED' | 'CONFIDENT' | 'FOMO' | 'REVENGE' | 'ANXIOUS' | 'NEUTRAL' | 'IMPATIENT';

export type TradeOutcome = 'WIN' | 'LOSS' | 'BREAKEVEN';
export type TradingSessionTag = 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP';

export interface JournalTrade {
  id: string;
  symbol: MarketSymbol | string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  pnl: number;
  rMultiple: number;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  session: TradingSessionTag;
  playbookName: string;
  emotion: TradeEmotion;
  mistakeTag: string;
  notes: string;
  entryDate: string;
  tags?: string[];
  chartScreenshot?: string;
}

export interface MarketIdeaComment {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  text: string;
  createdAt: string;
}

export interface MarketIdea {
  id: string;
  title: string;
  content: string;
  symbol: MarketSymbol | string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  chartUrl?: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  likesCount: number;
  likedBy: string[];
  commentsCount: number;
  comments: MarketIdeaComment[];
  createdAt: string;
  timestampMs?: number;
}
